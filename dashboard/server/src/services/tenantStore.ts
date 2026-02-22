import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";

export interface TenantRegistration {
  id: string;
  displayName: string;
  tenantId: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  color?: string;
}

export interface CreateTenantInput {
  displayName: string;
  tenantId: string;
  color?: string;
  isDefault?: boolean;
}

export interface UpdateTenantInput {
  displayName?: string;
  color?: string;
}

const TENANT_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_DISPLAY_NAME_LENGTH = 128;
const ALLOWED_COLORS = new Set([
  "blue", "green", "orange", "purple", "red", "teal", "pink", "yellow", "indigo", "gray",
]);

function getStorePath(): string {
  return config.tenantStore.filePath;
}

async function readStore(): Promise<TenantRegistration[]> {
  const path = getStorePath();
  if (!existsSync(path)) {
    return [];
  }
  const raw = await readFile(path, "utf-8");
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [];
}

async function writeStore(tenants: TenantRegistration[]): Promise<void> {
  const path = getStorePath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(path, JSON.stringify(tenants, null, 2), "utf-8");
}

export async function listTenants(): Promise<TenantRegistration[]> {
  return readStore();
}

export async function getTenant(id: string): Promise<TenantRegistration | null> {
  const tenants = await readStore();
  return tenants.find((t) => t.id === id) ?? null;
}

export async function getTenantByTenantId(tenantId: string): Promise<TenantRegistration | null> {
  const tenants = await readStore();
  return tenants.find((t) => t.tenantId === tenantId) ?? null;
}

export async function getDefaultTenant(): Promise<TenantRegistration | null> {
  const tenants = await readStore();
  return tenants.find((t) => t.isDefault) ?? tenants[0] ?? null;
}

export async function createTenant(input: CreateTenantInput): Promise<TenantRegistration> {
  if (!TENANT_ID_REGEX.test(input.tenantId)) {
    throw new Error("Invalid tenant ID format. Must be a valid GUID.");
  }

  // Validate displayName length
  if (!input.displayName || input.displayName.trim().length === 0) {
    throw new Error("Display name is required.");
  }
  if (input.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
  }

  // Validate color if provided
  if (input.color && !ALLOWED_COLORS.has(input.color)) {
    throw new Error(`Invalid color. Allowed values: ${[...ALLOWED_COLORS].join(", ")}`);
  }

  const tenants = await readStore();

  if (tenants.some((t) => t.tenantId === input.tenantId)) {
    throw new Error(`Tenant ${input.tenantId} is already registered.`);
  }

  const now = new Date().toISOString();
  const isDefault = input.isDefault ?? tenants.length === 0;

  // If this is the new default, unset the current default
  if (isDefault) {
    for (const t of tenants) {
      t.isDefault = false;
    }
  }

  const tenant: TenantRegistration = {
    id: randomUUID(),
    displayName: input.displayName,
    tenantId: input.tenantId,
    isDefault,
    createdAt: now,
    updatedAt: now,
    color: input.color,
  };

  tenants.push(tenant);
  await writeStore(tenants);
  return tenant;
}

export async function updateTenant(
  id: string,
  input: UpdateTenantInput
): Promise<TenantRegistration> {
  const tenants = await readStore();
  const idx = tenants.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error(`Tenant registration ${id} not found.`);
  }

  const tenant = tenants[idx];
  if (input.displayName !== undefined) {
    if (input.displayName.trim().length === 0) {
      throw new Error("Display name cannot be empty.");
    }
    if (input.displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new Error(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
    }
    tenant.displayName = input.displayName;
  }
  if (input.color !== undefined) {
    if (input.color && !ALLOWED_COLORS.has(input.color)) {
      throw new Error(`Invalid color. Allowed values: ${[...ALLOWED_COLORS].join(", ")}`);
    }
    tenant.color = input.color;
  }
  tenant.updatedAt = new Date().toISOString();

  tenants[idx] = tenant;
  await writeStore(tenants);
  return tenant;
}

export async function deleteTenant(id: string): Promise<void> {
  const tenants = await readStore();
  const idx = tenants.findIndex((t) => t.id === id);
  if (idx === -1) {
    throw new Error(`Tenant registration ${id} not found.`);
  }

  const wasDefault = tenants[idx].isDefault;
  tenants.splice(idx, 1);

  // If we deleted the default, promote the first remaining tenant
  if (wasDefault && tenants.length > 0) {
    tenants[0].isDefault = true;
  }

  await writeStore(tenants);
}

export async function setDefaultTenant(id: string): Promise<TenantRegistration> {
  const tenants = await readStore();
  const target = tenants.find((t) => t.id === id);
  if (!target) {
    throw new Error(`Tenant registration ${id} not found.`);
  }

  for (const t of tenants) {
    t.isDefault = t.id === id;
  }
  target.updatedAt = new Date().toISOString();

  await writeStore(tenants);
  return target;
}
