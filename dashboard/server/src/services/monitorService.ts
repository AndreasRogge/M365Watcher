import { utcm } from "./graphClient.js";
import { getSnapshotBaseline } from "./snapshotService.js";
import { ApiError } from "../middleware/errorHandler.js";
import {
  listMonitoringResults,
  MonitoringResult,
} from "./monitoringResultService.js";

/**
 * Raw monitor shape from the UTCM API.
 * Note: the API does NOT return `baseline` or `lastMonitoringResult` on GET.
 * Baseline is write-only (sent on POST/PATCH). Monitoring results are a
 * separate resource that must be fetched and joined.
 */
interface ApiMonitor {
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
}

/**
 * Enriched monitor returned by our service layer, with the latest
 * monitoring result attached from the separate results endpoint.
 */
export interface Monitor {
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  baseline?: {
    displayName?: string;
    description?: string;
    resources?: Array<{
      resourceType: string;
      resourceName: string;
      resourceId: string;
      properties: Record<string, unknown>;
    }>;
  };
  lastMonitoringResult?: {
    status: string;
    detectedDateTime: string;
    completedDateTime: string;
    driftDetected: boolean;
    driftCount: number;
  };
}

interface MonitorListResponse {
  value: ApiMonitor[];
}

interface CreateMonitorInput {
  displayName: string;
  description?: string;
  baselineSnapshotId: string;
}

/**
 * Validate monitor display name:
 * - 8-32 characters
 * - Only alphabets, numbers, and spaces
 * (Matches UTCM-Management.ps1 validation logic)
 */
function validateMonitorDisplayName(displayName: string): void {
  if (!displayName || displayName.trim().length === 0) {
    throw new ApiError(400, "InvalidDisplayName", "Display name is required");
  }
  if (!/^[a-zA-Z0-9 ]+$/.test(displayName)) {
    throw new ApiError(
      400,
      "InvalidDisplayName",
      "Display name can only contain alphabets, numbers, and spaces"
    );
  }
  if (displayName.length < 8 || displayName.length > 32) {
    throw new ApiError(
      400,
      "InvalidDisplayName",
      `Display name must be 8-32 characters (currently ${displayName.length})`
    );
  }
}

/**
 * Pick the latest monitoring result per monitor from a flat list of results.
 */
function buildLatestResultMap(
  results: MonitoringResult[]
): Map<string, MonitoringResult> {
  const map = new Map<string, MonitoringResult>();
  for (const r of results) {
    const existing = map.get(r.monitorId);
    if (
      !existing ||
      new Date(r.detectedDateTime) > new Date(existing.detectedDateTime)
    ) {
      map.set(r.monitorId, r);
    }
  }
  return map;
}

/**
 * Enrich a raw API monitor with the latest monitoring result.
 */
function enrichMonitor(
  raw: ApiMonitor,
  latestResult?: MonitoringResult
): Monitor {
  return {
    id: raw.id,
    displayName: raw.displayName,
    description: raw.description,
    createdDateTime: raw.createdDateTime,
    lastMonitoringResult: latestResult
      ? {
          status: latestResult.status,
          detectedDateTime: latestResult.detectedDateTime,
          completedDateTime: latestResult.completedDateTime || "",
          driftDetected: latestResult.driftDetected,
          driftCount: latestResult.driftCount,
        }
      : undefined,
  };
}

export async function listMonitors(): Promise<Monitor[]> {
  // Fetch monitors and monitoring results in parallel
  const [monitorsResponse, results] = await Promise.all([
    utcm.get<MonitorListResponse>("/configurationMonitors"),
    listMonitoringResults(),
  ]);

  const rawMonitors = monitorsResponse.value || [];
  const latestMap = buildLatestResultMap(results);

  return rawMonitors.map((m) => enrichMonitor(m, latestMap.get(m.id)));
}

export async function getMonitor(monitorId: string): Promise<Monitor> {
  // Fetch monitor and its results in parallel
  const [raw, results] = await Promise.all([
    utcm.getOne<ApiMonitor>(`/configurationMonitors/${monitorId}`),
    listMonitoringResults(monitorId),
  ]);

  // Find the latest result
  const sorted = results.sort(
    (a, b) =>
      new Date(b.detectedDateTime).getTime() -
      new Date(a.detectedDateTime).getTime()
  );

  return enrichMonitor(raw, sorted[0]);
}

/**
 * Create a monitor from a completed snapshot.
 * Complex multi-step flow (port of UTCM-Management.ps1 lines 568-660):
 * 1. Validate display name (8-32 chars, alphanumeric + spaces)
 * 2. Fetch snapshot and verify status === "succeeded"
 * 3. GET the baseline config from snapshot's resourceLocation
 * 4. Build monitor body with baseline resources
 * 5. POST to create monitor
 */
export async function createMonitor(
  input: CreateMonitorInput
): Promise<Monitor> {
  validateMonitorDisplayName(input.displayName);

  // Fetch baseline from the snapshot - this validates snapshot exists and is succeeded
  const baselineData = (await getSnapshotBaseline(
    input.baselineSnapshotId
  )) as {
    displayName?: string;
    description?: string;
    resources?: unknown[];
  };

  const body = {
    displayName: input.displayName,
    description: input.description || "",
    baseline: {
      displayName: baselineData.displayName || input.displayName,
      description: baselineData.description || input.description || "",
      resources: baselineData.resources || [],
    },
  };

  const created = await utcm.post<ApiMonitor>("/configurationMonitors", body);
  return enrichMonitor(created);
}

/**
 * Update a monitor's baseline from a new snapshot.
 * WARNING: This deletes all previous drift records for the monitor!
 */
export async function updateMonitorBaseline(
  monitorId: string,
  newBaselineSnapshotId: string
): Promise<Monitor> {
  const baselineData = (await getSnapshotBaseline(
    newBaselineSnapshotId
  )) as {
    displayName?: string;
    description?: string;
    resources?: unknown[];
  };

  const body = {
    baseline: {
      displayName: baselineData.displayName || "",
      description: baselineData.description || "",
      resources: baselineData.resources || [],
    },
  };

  const updated = await utcm.patch<ApiMonitor>(
    `/configurationMonitors/${monitorId}`,
    body
  );
  return enrichMonitor(updated);
}

export async function deleteMonitor(monitorId: string): Promise<void> {
  try {
    await utcm.delete(`/configurationMonitors/${monitorId}`);
  } catch (err) {
    // If UTCM says the monitor is not found / expired, treat it as already deleted.
    if (err instanceof ApiError && (err.statusCode === 404 || err.message.includes("not found"))) {
      return;
    }
    throw err;
  }
}
