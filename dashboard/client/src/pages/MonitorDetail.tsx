import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useMonitor } from "../api/monitors";
import { useDrifts } from "../api/drifts";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { formatDate, formatRelativeTime, getResourceShortName, getWorkloadFromType } from "../lib/utils";

export function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: monitor, isLoading, error, refetch } = useMonitor(id!);
  const { data: drifts } = useDrifts({ monitorId: id });

  if (isLoading) return <LoadingSpinner message="Loading monitor..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;
  if (!monitor) return null;

  const activeDrifts = drifts?.filter((d) => d.status === "active") || [];
  const baselineResources = monitor.baseline?.resources || [];

  return (
    <div>
      <Link
        to="/monitors"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Monitors
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {monitor.displayName}
          </h1>
          {monitor.description && (
            <p className="mt-1 text-sm text-gray-400">{monitor.description}</p>
          )}
        </div>
        {monitor.lastMonitoringResult && (
          <StatusBadge status={monitor.lastMonitoringResult.status} />
        )}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Created</div>
          <div className="text-sm text-gray-200">{formatDate(monitor.createdDateTime)}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Baseline Resources</div>
          <div className="text-sm text-gray-200">{baselineResources.length}</div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Active Drifts</div>
          <div className={`text-sm font-medium ${activeDrifts.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {activeDrifts.length}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monitor ID</div>
          <div className="text-xs text-gray-400 font-mono break-all">{monitor.id}</div>
        </div>
      </div>

      {/* Active Drifts */}
      {activeDrifts.length > 0 && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 mb-8">
          <div className="border-b border-red-500/20 px-6 py-4">
            <h2 className="text-sm font-semibold text-red-400">
              Active Drifts ({activeDrifts.length})
            </h2>
          </div>
          <div className="divide-y divide-red-500/10">
            {activeDrifts.map((drift) => (
              <Link
                key={drift.id}
                to={`/drifts/${drift.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-red-500/5 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-gray-200">
                    {getResourceShortName(drift.resourceType)}
                  </span>
                  <span className="ml-2 text-xs text-gray-500">
                    {getWorkloadFromType(drift.resourceType)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={drift.changeType} />
                  <span className="text-xs text-gray-500">
                    {formatRelativeTime(drift.detectedDateTime)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Baseline Resources */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">
            Baseline Resources ({baselineResources.length})
          </h2>
        </div>
        {baselineResources.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-gray-500">
            No baseline resource details available.
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {baselineResources.slice(0, 50).map((resource, idx) => (
              <div key={idx} className="px-6 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-200">
                    {resource.resourceName || resource.resourceId}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {getResourceShortName(resource.resourceType)}
                  </span>
                </div>
              </div>
            ))}
            {baselineResources.length > 50 && (
              <div className="px-6 py-3 text-center text-xs text-gray-500">
                ...and {baselineResources.length - 50} more resources
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
