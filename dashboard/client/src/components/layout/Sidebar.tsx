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
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../auth/AuthContext";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/snapshots", icon: Camera, label: "Snapshots" },
  { to: "/monitors", icon: Monitor, label: "Monitors" },
  { to: "/drifts", icon: GitCompareArrows, label: "Drifts" },
  { to: "/monitoring-results", icon: Activity, label: "Results" },
  { to: "/resource-types", icon: Blocks, label: "Resource Types" },
];

export function Sidebar() {
  const { mode, isAuthenticated, account } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-gray-800 bg-gray-950">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-100">M365Watcher</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider">
            UTCM Dashboard
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600/10 text-blue-400"
                  : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
              )
            }
          >
            <Icon className="h-4.5 w-4.5" />
            {label}
          </NavLink>
        ))}

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-blue-600/10 text-blue-400"
                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
            )
          }
        >
          <Settings className="h-4.5 w-4.5" />
          Settings
        </NavLink>
      </nav>

      {/* Footer — auth status */}
      <div className="border-t border-gray-800 px-4 py-4">
        {mode === "user" && isAuthenticated && account ? (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
              {(account.name || account.username || "?").charAt(0).toUpperCase()}
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
            <span className="text-[10px]">App Credentials</span>
          </div>
        )}
      </div>
    </aside>
  );
}
