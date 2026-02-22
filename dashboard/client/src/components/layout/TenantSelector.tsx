import { useState, useRef, useEffect } from "react";
import { ChevronDown, Building2, Check } from "lucide-react";
import { useTenant } from "../../context/TenantContext";
import { cn } from "../../lib/utils";

const TENANT_COLORS: Record<string, string> = {
  blue: "bg-blue-500",
  green: "bg-emerald-500",
  purple: "bg-purple-500",
  orange: "bg-orange-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

function getTenantColor(color?: string): string {
  if (color && TENANT_COLORS[color]) return TENANT_COLORS[color];
  return "bg-gray-500";
}

export function TenantSelector() {
  const { tenants, activeTenant, switchTenant } = useTenant();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (tenants.length <= 1) {
    // Single tenant — show a static display, no dropdown
    if (!activeTenant) return null;
    return (
      <div className="mx-3 mb-2 flex items-center gap-2.5 rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2">
        <div className={cn("h-2.5 w-2.5 rounded-full", getTenantColor(activeTenant.color))} />
        <span className="truncate text-xs font-medium text-gray-300">
          {activeTenant.displayName}
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative mx-3 mb-2">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-colors",
          open
            ? "border-blue-500/50 bg-gray-800/80"
            : "border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-800/50"
        )}
      >
        {activeTenant ? (
          <>
            <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", getTenantColor(activeTenant.color))} />
            <span className="flex-1 truncate text-xs font-medium text-gray-300">
              {activeTenant.displayName}
            </span>
          </>
        ) : (
          <>
            <Building2 className="h-3.5 w-3.5 shrink-0 text-gray-500" />
            <span className="flex-1 text-xs text-gray-500">Select tenant</span>
          </>
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-gray-500 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-700 bg-gray-900 shadow-xl">
          <div className="p-1">
            {tenants.map((t) => {
              const isActive = activeTenant?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    switchTenant(t.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                    isActive
                      ? "bg-blue-600/10 text-blue-400"
                      : "text-gray-300 hover:bg-gray-800"
                  )}
                >
                  <div className={cn("h-2 w-2 shrink-0 rounded-full", getTenantColor(t.color))} />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-xs font-medium">{t.displayName}</div>
                    <div className="truncate text-[10px] text-gray-500">
                      {t.tenantId.substring(0, 8)}...
                    </div>
                  </div>
                  {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
