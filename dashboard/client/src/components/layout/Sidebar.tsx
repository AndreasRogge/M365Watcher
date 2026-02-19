import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Camera,
  Monitor,
  GitCompareArrows,
  Activity,
  Blocks,
  Shield,
} from "lucide-react";
import { cn } from "../../lib/utils";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Overview" },
  { to: "/snapshots", icon: Camera, label: "Snapshots" },
  { to: "/monitors", icon: Monitor, label: "Monitors" },
  { to: "/drifts", icon: GitCompareArrows, label: "Drifts" },
  { to: "/monitoring-results", icon: Activity, label: "Results" },
  { to: "/resource-types", icon: Blocks, label: "Resource Types" },
];

export function Sidebar() {
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
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 px-6 py-4">
        <p className="text-[10px] text-gray-600">
          UTCM API (Beta) &bull; v1.0
        </p>
      </div>
    </aside>
  );
}
