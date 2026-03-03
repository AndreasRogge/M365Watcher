import { useState } from "react";
import { Link } from "react-router-dom";
import { GitCompareArrows, Filter, X } from "lucide-react";
import { useDrifts } from "../api/drifts";
import { useMonitors } from "../api/monitors";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { EmptyState } from "../components/shared/EmptyState";
import { formatDate, getWorkloadFromType, getResourceShortName } from "../lib/utils";

export function Drifts() {
  const [monitorFilter, setMonitorFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: monitors } = useMonitors();
  const {
    data: drifts,
    isLoading,
    error,
    refetch,
  } = useDrifts({
    monitorId: monitorFilter || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  if (isLoading) return <LoadingSpinner message="Loading drifts..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;

  const getMonitorName = (monitorId: string) =>
    monitors?.find((m) => m.id === monitorId)?.displayName || monitorId.substring(0, 8) + "...";

  const hasFilters = monitorFilter || statusFilter !== "all";

  return (
    <div>
      <div className="mb-6 animate-in animate-in-1">
        <h1 className="text-2xl font-bold tracking-tight text-gray-100">
          Configuration Drifts
        </h1>
        <p className="mt-1.5 text-sm text-gray-500">
          Detected configuration changes from your baselines
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 animate-in animate-in-2">
        <Filter className="h-4 w-4 text-gray-600" />
        <select
          value={monitorFilter}
          onChange={(e) => setMonitorFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-gray-300 focus:border-blue-500/50 focus:outline-none transition-colors"
        >
          <option value="">All Monitors</option>
          {monitors?.map((m) => (
            <option key={m.id} value={m.id}>
              {m.displayName}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[13px] text-gray-300 focus:border-blue-500/50 focus:outline-none transition-colors"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => {
              setMonitorFilter("");
              setStatusFilter("all");
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-400 hover:bg-white/[0.04] hover:text-gray-200"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {/* Drifts Table */}
      {!drifts || drifts.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No drifts found"
          description={
            hasFilters
              ? "No drifts match your current filters. Try adjusting them."
              : "No configuration drifts detected. Your tenant is in compliance with all baselines!"
          }
        />
      ) : (
        <div className="card-surface rounded-xl overflow-hidden animate-in animate-in-3">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Workload
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Change
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Monitor
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Detected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {drifts.map((drift) => (
                <tr key={drift.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5">
                    <Link
                      to={`/drifts/${drift.id}`}
                      className="text-[13px] font-medium text-blue-400 hover:text-blue-300"
                    >
                      {getResourceShortName(drift.resourceType)}
                    </Link>
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-gray-500">
                    {getWorkloadFromType(drift.resourceType)}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={drift.changeType} />
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={drift.status} />
                  </td>
                  <td className="px-6 py-3.5 text-[13px] text-gray-500">
                    {getMonitorName(drift.monitorId)}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] tabular-nums text-gray-500">
                    {formatDate(drift.detectedDateTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
