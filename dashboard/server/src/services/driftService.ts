import { utcm } from "./graphClient.js";

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
  driftedProperties?: Array<{
    propertyName: string;
    desiredValue: unknown;
    detectedValue: unknown;
  }>;
}

interface DriftListResponse {
  value: Drift[];
}

interface DriftQueryParams {
  monitorId?: string;
  status?: "active" | "resolved";
}

export async function listDrifts(params?: DriftQueryParams): Promise<Drift[]> {
  const filters: string[] = [];

  if (params?.monitorId) {
    filters.push(`monitorId eq '${params.monitorId}'`);
  }
  if (params?.status) {
    filters.push(`status eq '${params.status}'`);
  }

  const filterQuery =
    filters.length > 0
      ? `?$filter=${encodeURIComponent(filters.join(" and "))}`
      : "";

  const response = await utcm.get<DriftListResponse>(
    `/configurationDrifts${filterQuery}`
  );
  return response.value || [];
}

export async function getDrift(driftId: string): Promise<Drift> {
  return utcm.getOne<Drift>(`/configurationDrifts/${driftId}`);
}
