import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  Monitor,
  GitCompareArrows,
  Activity,
  Blocks,
  Shield,
  Settings,
  Server,
  Building2,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../auth/AuthContext";
import { TenantSelector } from "./TenantSelector";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/snapshots", icon: Camera, label: "Snapshots" },
  { to: "/monitors", icon: Monitor, label: "Monitors" },
  { to: "/drifts", icon: GitCompareArrows, label: "Drifts" },
  { to: "/monitoring-results", icon: Activity, label: "Results" },
  { to: "/resource-types", icon: Blocks, label: "Resource Types" },
  { to: "/tenants", icon: Building2, label: "Tenants" },
];

export function Sidebar() {
  const { mode, isAuthenticated, account } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-white/[0.06] bg-[var(--surface-1)]">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="logo-glow flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-[13px] font-bold tracking-tight text-gray-100">
            M365Watcher
          </h1>
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
            UTCM Dashboard
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* Tenant Selector */}
      <div className="pt-4 pb-1">
        <TenantSelector />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        <div className="mb-3 px-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600">
            Navigation
          </span>
        </div>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
                isActive
                  ? "nav-active bg-blue-500/[0.08] text-blue-400"
                  : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200"
              )
            }
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Separator */}
        <div className="!my-3 mx-3 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all",
              isActive
                ? "nav-active bg-blue-500/[0.08] text-blue-400"
                : "text-gray-400 hover:bg-white/[0.03] hover:text-gray-200"
            )
          }
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* Footer - auth status */}
      <div className="border-t border-white/[0.06] px-4 py-4">
        {mode === "user" && isAuthenticated && account ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-[10px] font-bold text-white shadow-sm shadow-blue-500/20">
              {(account.name || account.username || "?")
                .charAt(0)
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-gray-300">
                {account.name}
              </p>
              <p className="truncate text-[10px] text-gray-600">
                {account.username}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-600">
            <Server className="h-3.5 w-3.5" />
            <span className="text-[10px] font-medium">App Credentials</span>
          </div>
        )}
      </div>
    </aside>
  );
}
