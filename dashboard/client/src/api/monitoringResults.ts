import { useQuery } from "@tanstack/react-query";
import api from "./client";
import type { MonitoringResult } from "../types";

export function useMonitoringResults(monitorId?: string) {
  return useQuery<MonitoringResult[]>({
    queryKey: ["monitoring-results", monitorId],
    queryFn: async () => {
      const query = monitorId ? `?monitorId=${monitorId}` : "";
      return (await api.get(`/monitoring-results${query}`)).data;
    },
  });
}
