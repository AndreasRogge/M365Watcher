import { useQuery } from "@tanstack/react-query";
import api from "./client";
import type { Drift } from "../types";

export function useDrifts(params?: {
  monitorId?: string;
  status?: string;
}) {
  return useQuery<Drift[]>({
    queryKey: ["drifts", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.monitorId) searchParams.set("monitorId", params.monitorId);
      if (params?.status && params.status !== "all")
        searchParams.set("status", params.status);
      const query = searchParams.toString();
      return (await api.get(`/drifts${query ? `?${query}` : ""}`)).data;
    },
  });
}

export function useDrift(id: string) {
  return useQuery<Drift>({
    queryKey: ["drifts", id],
    queryFn: async () => (await api.get(`/drifts/${id}`)).data,
    enabled: !!id,
  });
}
