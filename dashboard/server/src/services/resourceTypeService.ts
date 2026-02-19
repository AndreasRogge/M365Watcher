import { readFileSync, existsSync } from "fs";
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

// Load resource types from shared JSON data file (single source of truth at repo root)
const catalogPath = resolve(__dirname, "../../../../data/resourceTypes.json");

if (!existsSync(catalogPath)) {
  throw new Error(
    "Resource type catalog is missing. Ensure the data/ directory is present in the deployment."
  );
}

let catalog: ResourceTypeCatalog;
try {
  catalog = JSON.parse(readFileSync(catalogPath, "utf-8"));
  // Normalize all type strings to lowercase at load time
  for (const workload of Object.values(catalog)) {
    workload.types = workload.types.map((t) => t.toLowerCase());
  }
} catch (err) {
  throw new Error(
    `Failed to parse resource type catalog. Verify data/resourceTypes.json is valid JSON. Error: ${(err as Error).message}`
  );
}

export function getResourceTypes(): ResourceTypeCatalog {
  return structuredClone(catalog);
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
