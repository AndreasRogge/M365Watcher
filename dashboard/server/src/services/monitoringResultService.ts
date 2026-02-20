import { utcm } from "./graphClient.js";

export interface MonitoringResult {
  id: string;
  monitorId: string;
  status: "succeeded" | "failed" | "inProgress";
  detectedDateTime: string;
  completedDateTime?: string;
  driftDetected: boolean;
  driftCount: number;
}

/**
 * Raw API response from the UTCM configurationMonitoringResults endpoint.
 * The API uses different field names than our normalized MonitoringResult interface.
 */
interface ApiMonitoringResult {
  id: string;
  monitorId: string;
  runStatus: string;
  runInitiationDateTime: string;
  runCompletionDateTime?: string;
  driftsCount: number;
  driftsFixed: number;
  runType: string;
}

interface MonitoringResultListResponse {
  value: ApiMonitoringResult[];
}

/** Map the raw API response to our normalized MonitoringResult interface. */
function mapResult(raw: ApiMonitoringResult): MonitoringResult {
  // API returns "successful"; normalize to "succeeded" for consistency
  let status: MonitoringResult["status"];
  if (raw.runStatus === "successful" || raw.runStatus === "succeeded") {
    status = "succeeded";
  } else if (raw.runStatus === "failed") {
    status = "failed";
  } else {
    status = "inProgress";
  }

  return {
    id: raw.id,
    monitorId: raw.monitorId,
    status,
    detectedDateTime: raw.runInitiationDateTime,
    completedDateTime: raw.runCompletionDateTime,
    driftDetected: raw.driftsCount > 0,
    driftCount: raw.driftsCount,
  };
}

export async function listMonitoringResults(
  monitorId?: string
): Promise<MonitoringResult[]> {
  const filterQuery = monitorId
    ? `?$filter=${encodeURIComponent(`monitorId eq '${monitorId}'`)}`
    : "";

  const response = await utcm.get<MonitoringResultListResponse>(
    `/configurationMonitoringResults${filterQuery}`
  );
  return (response.value || []).map(mapResult);
}

export async function getMonitoringResult(
  resultId: string
): Promise<MonitoringResult> {
  const raw = await utcm.getOne<ApiMonitoringResult>(
    `/configurationMonitoringResults/${resultId}`
  );
  return mapResult(raw);
}
