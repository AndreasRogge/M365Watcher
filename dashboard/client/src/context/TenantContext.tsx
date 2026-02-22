import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { TenantInfo } from "../types";

const TENANT_STORAGE_KEY = "m365watcher_active_tenant";

interface TenantContextValue {
  tenants: TenantInfo[];
  activeTenant: TenantInfo | null;
  setTenants: (tenants: TenantInfo[]) => void;
  switchTenant: (tenantId: string) => void;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant must be used within TenantProvider");
  return ctx;
}

/** Returns the active tenant's registration ID for API headers, or undefined. */
export function getActiveTenantId(): string | undefined {
  return sessionStorage.getItem(TENANT_STORAGE_KEY) || undefined;
}

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenants, setTenantsState] = useState<TenantInfo[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(
    () => sessionStorage.getItem(TENANT_STORAGE_KEY)
  );
  const queryClient = useQueryClient();

  const activeTenant =
    tenants.find((t) => t.id === activeTenantId) ??
    tenants.find((t) => t.isDefault) ??
    tenants[0] ??
    null;

  const setTenants = useCallback((newTenants: TenantInfo[]) => {
    setTenantsState(newTenants);
  }, []);

  const switchTenant = useCallback(
    (tenantRegId: string) => {
      if (tenantRegId === activeTenantId) return;
      setActiveTenantId(tenantRegId);
      sessionStorage.setItem(TENANT_STORAGE_KEY, tenantRegId);
      // All cached data belongs to the previous tenant — invalidate everything
      queryClient.clear();
    },
    [activeTenantId, queryClient]
  );

  return (
    <TenantContext.Provider
      value={{ tenants, activeTenant, setTenants, switchTenant }}
    >
      {children}
    </TenantContext.Provider>
  );
}
