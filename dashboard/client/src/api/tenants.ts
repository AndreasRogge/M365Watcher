import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./client";
import type {
  TenantRegistration,
  CreateTenantInput,
  UpdateTenantInput,
  TenantTestResult,
} from "../types";

export function useTenants() {
  return useQuery<TenantRegistration[]>({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data } = await api.get("/tenants");
      return data.value;
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation<TenantRegistration, Error, CreateTenantInput>({
    mutationFn: async (input) => {
      const { data } = await api.post("/tenants", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation<TenantRegistration, Error, { id: string; input: UpdateTenantInput }>({
    mutationFn: async ({ id, input }) => {
      const { data } = await api.put(`/tenants/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      await api.delete(`/tenants/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useSetDefaultTenant() {
  const queryClient = useQueryClient();
  return useMutation<TenantRegistration, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post(`/tenants/${id}/default`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
  });
}

export function useTestTenantConnection() {
  return useMutation<TenantTestResult, Error, string>({
    mutationFn: async (id) => {
      const { data } = await api.post(`/tenants/${id}/test`);
      return data;
    },
  });
}
