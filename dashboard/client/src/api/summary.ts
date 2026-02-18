import { useQuery } from "@tanstack/react-query";
import api from "./client";
import type { DashboardSummary } from "../types";

export function useSummary() {
  return useQuery<DashboardSummary>({
    queryKey: ["summary"],
    queryFn: async () => (await api.get("/summary")).data,
    refetchInterval: 60000, // Refresh every minute
  });
}
