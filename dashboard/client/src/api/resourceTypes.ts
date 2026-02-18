import { useQuery } from "@tanstack/react-query";
import api from "./client";
import type { ResourceTypeCatalog } from "../types";

export function useResourceTypes() {
  return useQuery<ResourceTypeCatalog>({
    queryKey: ["resource-types"],
    queryFn: async () => (await api.get("/resource-types")).data,
    staleTime: Infinity, // Static data, never refetch
  });
}
