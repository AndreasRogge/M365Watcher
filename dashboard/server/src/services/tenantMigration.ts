import { existsSync } from "node:fs";
import { config } from "../config.js";
import { createTenant, listTenants } from "./tenantStore.js";

/**
 * On first startup, if no tenants are registered but the legacy AZURE_TENANT_ID
 * env var is set, auto-register it as the default tenant. This provides seamless
 * backward compatibility for existing single-tenant deployments.
 */
export async function migrateExistingTenant(): Promise<void> {
  const tenants = await listTenants();
  if (tenants.length > 0) {
    return; // Already have tenants registered
  }

  const tenantId = config.azure.tenantId;
  if (!tenantId) {
    return; // No legacy tenant ID configured
  }

  try {
    const tenant = await createTenant({
      displayName: "Default Tenant",
      tenantId,
      isDefault: true,
    });
    console.log(
      `[TenantMigration] Auto-registered existing tenant ${tenantId} as "${tenant.displayName}" (${tenant.id})`
    );
  } catch (err) {
    console.error("[TenantMigration] Failed to migrate existing tenant:", err);
  }
}
