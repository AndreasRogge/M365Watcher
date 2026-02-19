import { Link } from "react-router-dom";
import {
  Camera,
  Monitor,
  AlertTriangle,
  Activity,
  ArrowRight,
} from "lucide-react";
import { useSummary } from "../api/summary";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { formatRelativeTime, getWorkloadFromType, getResourceShortName } from "../lib/utils";

export function Overview() {
  const { data: summary, isLoading, error, refetch } = useSummary();

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
      to: "/snapshots",
    },
    {
      label: "Monitors",
      value: summary.counts.monitors,
      sub: "active monitors",
      icon: Monitor,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      to: "/monitors",
    },
    {
      label: "Active Drifts",
      value: summary.counts.activeDrifts,
      sub: `${summary.counts.totalDrifts} total`,
      icon: AlertTriangle,
      color: summary.counts.activeDrifts > 0 ? "text-red-400" : "text-emerald-400",
      bgColor: summary.counts.activeDrifts > 0 ? "bg-red-500/10" : "bg-emerald-500/10",
      to: "/drifts",
    },
    {
      label: "Last Run",
      value: summary.lastMonitoringRun
        ? formatRelativeTime(summary.lastMonitoringRun.detectedDateTime)
        : "N/A",
      sub: summary.lastMonitoringRun?.status || "no runs yet",
      icon: Activity,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      to: "/monitoring-results",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-400">
          Microsoft 365 configuration monitoring overview
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="group rounded-xl border border-gray-800 bg-gray-900/50 p-5 hover:border-gray-700 hover:bg-gray-900 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-700 group-hover:text-gray-500 transition-colors" />
            </div>
            <div className="text-2xl font-bold text-gray-100">
              {card.value}
            </div>
            <div className="mt-0.5 text-xs text-gray-500">{card.sub}</div>
            <div className="mt-1 text-sm font-medium text-gray-400">
              {card.label}
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Drifts */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">
            Recent Drifts
          </h2>
          <Link
            to="/drifts"
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            View all
          </Link>
        </div>
        {summary.recentDrifts.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No drifts detected yet. Your configuration is clean!
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {summary.recentDrifts.map((drift) => (
              <Link
                key={drift.id}
                to={`/drifts/${drift.id}`}
                className="flex items-center gap-4 px-6 py-3 hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-200 truncate">
                      {getResourceShortName(drift.resourceType)}
                    </span>
                    <StatusBadge status={drift.changeType} />
                    <StatusBadge status={drift.status} />
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500">
                    {getWorkloadFromType(drift.resourceType)}
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatRelativeTime(drift.detectedDateTime)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Monitor Status */}
      {summary.monitors.length > 0 && (
        <div className="mt-6 rounded-xl border border-gray-800 bg-gray-900/50">
          <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
            <h2 className="text-sm font-semibold text-gray-200">
              Monitor Status
            </h2>
            <Link
              to="/monitors"
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Manage monitors
            </Link>
          </div>
          <div className="divide-y divide-gray-800">
            {summary.monitors.map((mon) => (
              <Link
                key={mon.id}
                to={`/monitors/${mon.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-800/30 transition-colors"
              >
                <span className="text-sm text-gray-200">
                  {mon.displayName}
                </span>
                <div className="flex items-center gap-3">
                  {mon.lastMonitoringResult ? (
                    <>
                      <StatusBadge
                        status={mon.lastMonitoringResult.status}
                      />
                      {mon.lastMonitoringResult.driftDetected && (
                        <span className="text-xs text-red-400">
                          {mon.lastMonitoringResult.driftCount} drift(s)
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-gray-500">
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
