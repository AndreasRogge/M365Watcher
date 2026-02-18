import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ResourceTypeWorkload {
  label: string;
  icon: string;
  types: string[];
}

export type ResourceTypeCatalog = Record<string, ResourceTypeWorkload>;

// Load resource types from static JSON file (107 verified types across 5 workloads)
const catalogPath = resolve(__dirname, "../data/resourceTypes.json");
const catalog: ResourceTypeCatalog = JSON.parse(
  readFileSync(catalogPath, "utf-8")
);

export function getResourceTypes(): ResourceTypeCatalog {
  return catalog;
}

export function getAllResourceTypeNames(): string[] {
  return Object.values(catalog).flatMap((workload) => workload.types);
}

export function isValidResourceType(resourceType: string): boolean {
  return getAllResourceTypeNames().includes(resourceType.toLowerCase());
}

export function getWorkloadForType(
  resourceType: string
): string | undefined {
  for (const [workloadKey, workload] of Object.entries(catalog)) {
    if (workload.types.includes(resourceType.toLowerCase())) {
      return workloadKey;
    }
  }
  return undefined;
}
