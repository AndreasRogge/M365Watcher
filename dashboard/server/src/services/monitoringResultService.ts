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

interface MonitoringResultListResponse {
  value: MonitoringResult[];
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
  return response.value || [];
}

export async function getMonitoringResult(
  resultId: string
): Promise<MonitoringResult> {
  return utcm.getOne<MonitoringResult>(
    `/configurationMonitoringResults/${resultId}`
  );
}
