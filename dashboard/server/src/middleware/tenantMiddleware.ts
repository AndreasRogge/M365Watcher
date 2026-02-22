import { Request, Response, NextFunction } from "express";
import { getDefaultTenant, getTenant, getTenantByTenantId } from "../services/tenantStore.js";
import { requestContext, getRequestAuth } from "./requestContext.js";

/**
 * Resolves the target tenant for each API request and injects tenantId
 * into the request's async context so graphClient can acquire the correct token.
 *
 * Resolution order:
 * 1. X-Tenant-Id header (tenant registration ID or raw Azure tenant ID)
 * 2. ?tenantId query parameter
 * 3. Default registered tenant
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const headerValue = req.headers["x-tenant-id"] as string | undefined;
    const queryValue = req.query.tenantId as string | undefined;
    const requestedId = headerValue || queryValue;

    let resolvedTenantId: string | undefined;

    if (requestedId) {
      // Try as registration ID first, then as raw Azure tenant ID
      const byId = await getTenant(requestedId);
      if (byId) {
        resolvedTenantId = byId.tenantId;
      } else {
        const byTenantId = await getTenantByTenantId(requestedId);
        if (byTenantId) {
          resolvedTenantId = byTenantId.tenantId;
        } else {
          res.status(400).json({
            error: {
              code: "TenantNotFound",
              message: `Tenant "${requestedId}" is not registered. Register it first via POST /api/tenants.`,
            },
          });
          return;
        }
      }
    } else {
      // Fall back to default tenant
      const defaultTenant = await getDefaultTenant();
      if (defaultTenant) {
        resolvedTenantId = defaultTenant.tenantId;
      }
    }

    // Re-wrap the request context with the resolved tenantId.
    // The authMiddleware already established the context; we augment it with tenantId.
    const currentAuth = getRequestAuth();

    // In user auth mode, the user's JWT tid must match the requested tenant.
    // This prevents a user authenticated against tenant A from querying tenant B's data
    // via the X-Tenant-Id header (app credentials handle cross-tenant access separately).
    if (currentAuth.mode === "user" && resolvedTenantId && currentAuth.userClaims) {
      const userTid = currentAuth.userClaims.tid as string | undefined;
      if (userTid && userTid !== resolvedTenantId) {
        res.status(403).json({
          error: {
            code: "TenantMismatch",
            message: "Your authentication token does not grant access to the requested tenant.",
          },
        });
        return;
      }
    }

    const augmented = { ...currentAuth, tenantId: resolvedTenantId };
    requestContext.run(augmented, () => next());
  } catch (err) {
    next(err);
  }
}
