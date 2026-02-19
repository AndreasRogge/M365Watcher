import { utcm, graphRequest } from "./graphClient.js";
import { ApiError } from "../middleware/errorHandler.js";

export interface Snapshot {
  id: string;
  displayName: string;
  description?: string;
  status: "inProgress" | "succeeded" | "failed";
  createdDateTime: string;
  resources: string[];
  resourceLocation?: string;
  resourceCount?: number;
}

interface SnapshotListResponse {
  value: Snapshot[];
}

interface CreateSnapshotInput {
  displayName: string;
  description?: string;
  resources: string[];
}

/**
 * Validate snapshot display name - must contain only alphabets, numbers, and spaces
 */
function validateDisplayName(displayName: string): void {
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
}

export async function listSnapshots(): Promise<Snapshot[]> {
  const response = await utcm.get<SnapshotListResponse>(
    "/configurationSnapshotJobs"
  );
  return response.value || [];
}

export async function getSnapshot(snapshotId: string): Promise<Snapshot> {
  return utcm.getOne<Snapshot>(
    `/configurationSnapshotJobs/${snapshotId}`
  );
}

export async function createSnapshot(
  input: CreateSnapshotInput
): Promise<Snapshot> {
  validateDisplayName(input.displayName);

  if (!input.resources || input.resources.length === 0) {
    throw new ApiError(
      400,
      "InvalidResources",
      "At least one resource type must be specified"
    );
  }

  const body = {
    displayName: input.displayName,
    description: input.description || "",
    resources: Array.isArray(input.resources)
      ? input.resources
      : [input.resources],
  };

  return utcm.post<Snapshot>(
    "/configurationSnapshots/createSnapshot",
    body
  );
}

export async function deleteSnapshot(snapshotId: string): Promise<void> {
  try {
    await utcm.delete(`/configurationSnapshotJobs/${snapshotId}`);
  } catch (err) {
    // If UTCM says the snapshot is not found / expired, treat it as already deleted.
    // The snapshot list will refresh and it will disappear on its own.
    if (err instanceof ApiError && (err.statusCode === 404 || err.message.includes("not found"))) {
      return;
    }
    throw err;
  }
}

/**
 * Fetch the baseline data from a completed snapshot's resourceLocation.
 * This is needed for creating monitors from snapshots.
 */
export async function getSnapshotBaseline(
  snapshotId: string
): Promise<unknown> {
  const snapshot = await getSnapshot(snapshotId);

  if (snapshot.status !== "succeeded") {
    throw new ApiError(
      400,
      "SnapshotNotReady",
      `Snapshot status is '${snapshot.status}'. Only succeeded snapshots can be used as baselines.`
    );
  }

  if (!snapshot.resourceLocation) {
    throw new ApiError(
      400,
      "NoResourceLocation",
      "Snapshot does not have a resourceLocation URL"
    );
  }

  return graphRequest(snapshot.resourceLocation, { noPagination: true });
}

/**
 * Fetch the full contents (captured configuration) of a completed snapshot.
 * Returns the snapshot metadata along with all resource configurations.
 */
export async function getSnapshotContents(
  snapshotId: string
): Promise<{ snapshot: Snapshot; contents: SnapshotContents }> {
  const snapshot = await getSnapshot(snapshotId);

  if (snapshot.status !== "succeeded") {
    throw new ApiError(
      400,
      "SnapshotNotReady",
      `Snapshot status is '${snapshot.status}'. Contents are only available for succeeded snapshots.`
    );
  }

  if (!snapshot.resourceLocation) {
    throw new ApiError(
      400,
      "NoResourceLocation",
      "Snapshot does not have a resourceLocation URL"
    );
  }

  const data = await graphRequest<SnapshotContents>(
    snapshot.resourceLocation,
    { noPagination: true }
  );

  return { snapshot, contents: data };
}

export interface SnapshotResource {
  resourceType: string;
  resourceName: string;
  resourceId: string;
  properties: Record<string, unknown>;
}

export interface SnapshotContents {
  displayName?: string;
  description?: string;
  resources?: SnapshotResource[];
}
