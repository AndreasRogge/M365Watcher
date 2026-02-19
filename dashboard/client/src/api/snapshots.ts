import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import type { Snapshot, CreateSnapshotInput, SnapshotContentsResponse } from "../types";

export function useSnapshots() {
  return useQuery<Snapshot[]>({
    queryKey: ["snapshots"],
    queryFn: async () => (await api.get("/snapshots")).data,
    refetchInterval: (query) => {
      // Auto-refresh every 10s if any snapshot is in progress
      const data = query.state.data;
      if (data?.some((s) => s.status === "inProgress")) return 10000;
      return false;
    },
  });
}

export function useSnapshot(id: string) {
  return useQuery<Snapshot>({
    queryKey: ["snapshots", id],
    queryFn: async () => (await api.get(`/snapshots/${id}`)).data,
    enabled: !!id,
  });
}

export function useSnapshotContents(id: string, enabled = false) {
  return useQuery<SnapshotContentsResponse>({
    queryKey: ["snapshots", id, "contents"],
    queryFn: async () => (await api.get(`/snapshots/${id}/contents`)).data,
    enabled: !!id && enabled,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes — snapshot contents don't change
  });
}

export function useCreateSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSnapshotInput) =>
      (await api.post("/snapshots", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => await api.delete(`/snapshots/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
}
