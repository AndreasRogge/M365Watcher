import { useState } from "react";
import { Activity, Filter } from "lucide-react";
import { useMonitoringResults } from "../api/monitoringResults";
import { useMonitors } from "../api/monitors";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { EmptyState } from "../components/shared/EmptyState";
import { formatDate } from "../lib/utils";

export function MonitoringResults() {
  const [monitorFilter, setMonitorFilter] = useState("");
  const { data: monitors } = useMonitors();
  const {
    data: results,
    isLoading,
    error,
    refetch,
  } = useMonitoringResults(monitorFilter || undefined);

  if (isLoading) return <LoadingSpinner message="Loading monitoring results..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;

  const getMonitorName = (monitorId: string) =>
    monitors?.find((m) => m.id === monitorId)?.displayName || monitorId.substring(0, 8) + "...";

  const sortedResults = [...(results || [])].sort(
    (a, b) =>
      new Date(b.detectedDateTime).getTime() -
      new Date(a.detectedDateTime).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Monitoring Results</h1>
        <p className="mt-1 text-sm text-gray-400">
          Timeline of configuration monitoring runs (every 6 hours)
        </p>
      </div>

      {/* Filter */}
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
      </div>

      {/* Results Timeline */}
      {sortedResults.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No monitoring results"
          description="Monitoring runs happen every 6 hours. Results will appear here after the first run."
        />
      ) : (
        <div className="space-y-3">
          {sortedResults.map((result) => (
            <div
              key={result.id}
              className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 hover:bg-gray-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={result.status} />
                  <span className="text-sm font-medium text-gray-200">
                    {getMonitorName(result.monitorId)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDate(result.detectedDateTime)}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-6 text-xs text-gray-400">
                <span>
                  Drift Detected:{" "}
                  <span
                    className={
                      result.driftDetected
                        ? "text-red-400 font-medium"
                        : "text-emerald-400"
                    }
                  >
                    {result.driftDetected ? "Yes" : "No"}
                  </span>
                </span>
                {result.driftDetected && (
                  <span>
                    Drift Count:{" "}
                    <span className="text-red-400 font-medium">
                      {result.driftCount}
                    </span>
                  </span>
                )}
                {result.completedDateTime && (
                  <span>
                    Completed: {formatDate(result.completedDateTime)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
