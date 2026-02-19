// ===== Snapshots =====
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

export interface CreateSnapshotInput {
  displayName: string;
  description?: string;
  resources: string[];
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

export interface SnapshotContentsResponse {
  snapshot: Snapshot;
  contents: SnapshotContents;
}

// ===== Monitors =====
export interface Monitor {
  id: string;
  displayName: string;
  description?: string;
  createdDateTime: string;
  baseline?: {
    displayName?: string;
    description?: string;
    resources?: BaselineResource[];
  };
  lastMonitoringResult?: {
    status: string;
    detectedDateTime: string;
    completedDateTime: string;
    driftDetected: boolean;
    driftCount: number;
  };
}

export interface BaselineResource {
  resourceType: string;
  resourceName: string;
  resourceId: string;
  properties: Record<string, unknown>;
}

export interface CreateMonitorInput {
  displayName: string;
  description?: string;
  baselineSnapshotId: string;
}

// ===== Drifts =====
export interface Drift {
  id: string;
  monitorId: string;
  resourceType: string;
  resourceId: string;
  status: "active" | "resolved";
  detectedDateTime: string;
  changeType: "added" | "modified" | "deleted";
  previousValue?: Record<string, unknown>;
  currentValue?: Record<string, unknown>;
  driftedProperties?: DriftedProperty[];
}

export interface DriftedProperty {
  propertyName: string;
  desiredValue: unknown;
  detectedValue: unknown;
}

// ===== Monitoring Results =====
export interface MonitoringResult {
  id: string;
  monitorId: string;
  status: "succeeded" | "failed" | "inProgress";
  detectedDateTime: string;
  completedDateTime?: string;
  driftDetected: boolean;
  driftCount: number;
}

// ===== Resource Types =====
export interface ResourceTypeWorkload {
  label: string;
  icon: string;
  types: string[];
}

export type ResourceTypeCatalog = Record<string, ResourceTypeWorkload>;

// ===== Summary =====
export interface DashboardSummary {
  counts: {
    snapshots: number;
    snapshotsByStatus: {
      succeeded: number;
      inProgress: number;
      failed: number;
    };
    monitors: number;
    activeDrifts: number;
    totalDrifts: number;
  };
  lastMonitoringRun: MonitoringResult | null;
  recentDrifts: Drift[];
  monitors: Array<{
    id: string;
    displayName: string;
    createdDateTime: string;
    lastMonitoringResult?: Monitor["lastMonitoringResult"];
  }>;
}

// ===== API Error =====
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}
