import { useState } from "react";
import { Link } from "react-router-dom";
import { GitCompareArrows, Filter } from "lucide-react";
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

  // Get monitor name by id
  const getMonitorName = (monitorId: string) =>
    monitors?.find((m) => m.id === monitorId)?.displayName || monitorId.substring(0, 8) + "...";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Configuration Drifts</h1>
        <p className="mt-1 text-sm text-gray-400">
          Detected configuration changes from your baselines
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <Filter className="h-4 w-4 text-gray-500" />
        <select
          value={monitorFilter}
          onChange={(e) => setMonitorFilter(e.target.value)}
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
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
          className="rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="resolved">Resolved</option>
        </select>
        {(monitorFilter || statusFilter !== "all") && (
          <button
            onClick={() => {
              setMonitorFilter("");
              setStatusFilter("all");
            }}
            className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Drifts Table */}
      {!drifts || drifts.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No drifts found"
          description={
            monitorFilter || statusFilter !== "all"
              ? "No drifts match your current filters. Try adjusting them."
              : "No configuration drifts detected. Your tenant is in compliance with all baselines!"
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resource
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Workload
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Change
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Monitor
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Detected
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {drifts.map((drift) => (
                <tr key={drift.id} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      to={`/drifts/${drift.id}`}
                      className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      {getResourceShortName(drift.resourceType)}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {getWorkloadFromType(drift.resourceType)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={drift.changeType} />
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={drift.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {getMonitorName(drift.monitorId)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
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
