import { Link } from "react-router-dom";
import {
  Camera,
  Monitor,
  AlertTriangle,
  Activity,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { useSummary } from "../api/summary";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { formatRelativeTime, getWorkloadFromType, getResourceShortName } from "../lib/utils";
import { useTenant } from "../context/TenantContext";

export function Overview() {
  const { data: summary, isLoading, error, refetch } = useSummary();
  const { activeTenant } = useTenant();

  if (isLoading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error)
    return (
      <ErrorDisplay message={error.message} onRetry={() => refetch()} />
    );
  if (!summary) return null;

  const cards = [
    {
      label: "Snapshots",
      value: summary.counts.snapshots,
      sub: `${summary.counts.snapshotsByStatus.succeeded} succeeded`,
      icon: Camera,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      iconGlow: "shadow-blue-500/20",
      to: "/snapshots",
    },
    {
      label: "Monitors",
      value: summary.counts.monitors,
      sub: "active monitors",
      icon: Monitor,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      iconGlow: "shadow-emerald-500/20",
      to: "/monitors",
    },
    {
      label: "Active Drifts",
      value: summary.counts.activeDrifts,
      sub: `${summary.counts.totalDrifts} total`,
      icon: AlertTriangle,
      color: summary.counts.activeDrifts > 0 ? "text-red-400" : "text-emerald-400",
      bgColor: summary.counts.activeDrifts > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
      iconGlow: summary.counts.activeDrifts > 0 ? "shadow-red-500/20" : "shadow-emerald-500/20",
      to: "/drifts",
    },
    {
      label: "Last Run",
      value: summary.lastMonitoringRun
        ? formatRelativeTime(summary.lastMonitoringRun.detectedDateTime)
        : "N/A",
      sub: summary.lastMonitoringRun?.status || "no runs yet",
      icon: Activity,
      color: "text-violet-400",
      bgColor: "bg-violet-500/10",
      iconGlow: "shadow-violet-500/20",
      to: "/monitoring-results",
    },
  ];

  return (
    <div>
      <div className="mb-8 animate-in animate-in-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          {activeTenant ? (
            <>
              <span className="text-gray-400">{activeTenant.displayName}</span>
              {" \u2014 "}
            </>
          ) : ""}
          Microsoft 365 configuration monitoring overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <Link
            key={card.label}
            to={card.to}
            className={`card-shine card-surface group rounded-xl p-5 transition-all hover:translate-y-[-1px] animate-in animate-in-${i + 1}`}
          >
            <div className="relative z-10 flex items-center justify-between mb-4">
              <div className={`rounded-lg p-2.5 ${card.bgColor} shadow-sm ${card.iconGlow}`}>
                <card.icon className={`h-[18px] w-[18px] ${card.color}`} />
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-gray-700 transition-all group-hover:text-gray-400 group-hover:translate-x-0.5" />
            </div>
            <div className="relative z-10">
              <div className="text-[28px] font-bold leading-none tracking-tight text-gray-100">
                {card.value}
              </div>
              <div className="mt-1.5 text-[11px] font-medium text-gray-600">
                {card.sub}
              </div>
              <div className="mt-1 text-[13px] font-semibold text-gray-400">
                {card.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Drifts */}
      <div className="card-surface rounded-xl animate-in animate-in-5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[13px] font-semibold text-gray-200">
            Recent Drifts
          </h2>
          <Link
            to="/drifts"
            className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            View all
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
        {summary.recentDrifts.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-500">
              No drifts detected yet. Your configuration is clean!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {summary.recentDrifts.map((drift) => (
              <Link
                key={drift.id}
                to={`/drifts/${drift.id}`}
                className="flex items-center gap-4 px-6 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-gray-200 truncate">
                      {getResourceShortName(drift.resourceType)}
                    </span>
                    <StatusBadge status={drift.changeType} />
                    <StatusBadge status={drift.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-gray-600">
                    {getWorkloadFromType(drift.resourceType)}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-gray-600 whitespace-nowrap tabular-nums">
                  {formatRelativeTime(drift.detectedDateTime)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Monitor Status */}
      {summary.monitors.length > 0 && (
        <div className="mt-5 card-surface rounded-xl animate-in animate-in-5">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
            <h2 className="text-[13px] font-semibold text-gray-200">
              Monitor Status
            </h2>
            <Link
              to="/monitors"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
            >
              Manage monitors
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {summary.monitors.map((mon) => (
              <Link
                key={mon.id}
                to={`/monitors/${mon.id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-[13px] font-medium text-gray-300">
                  {mon.displayName}
                </span>
                <div className="flex items-center gap-3">
                  {mon.lastMonitoringResult ? (
                    <>
                      <StatusBadge
                        status={mon.lastMonitoringResult.status}
                      />
                      {mon.lastMonitoringResult.driftDetected && (
                        <span className="text-xs font-medium text-red-400">
                          {mon.lastMonitoringResult.driftCount} drift(s)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-600">
                      Awaiting first run
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
