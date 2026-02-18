import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import type { Monitor, CreateMonitorInput } from "../types";

export function useMonitors() {
  return useQuery<Monitor[]>({
    queryKey: ["monitors"],
    queryFn: async () => (await api.get("/monitors")).data,
  });
}

export function useMonitor(id: string) {
  return useQuery<Monitor>({
    queryKey: ["monitors", id],
    queryFn: async () => (await api.get(`/monitors/${id}`)).data,
    enabled: !!id,
  });
}

export function useCreateMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateMonitorInput) =>
      (await api.post("/monitors", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useUpdateMonitorBaseline() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      monitorId,
      newBaselineSnapshotId,
    }: {
      monitorId: string;
      newBaselineSnapshotId: string;
    }) =>
      (
        await api.patch(`/monitors/${monitorId}/baseline`, {
          newBaselineSnapshotId,
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["drifts"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useDeleteMonitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await api.delete(`/monitors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monitors"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}
