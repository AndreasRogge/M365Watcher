import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useDrift } from "../api/drifts";
import { useMonitors } from "../api/monitors";
import { StatusBadge } from "../components/shared/StatusBadge";
import { JsonDiffViewer } from "../components/shared/JsonDiffViewer";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { formatDate, getWorkloadFromType, getResourceShortName } from "../lib/utils";

export function DriftDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: drift, isLoading, error, refetch } = useDrift(id!);
  const { data: monitors } = useMonitors();

  if (isLoading) return <LoadingSpinner message="Loading drift details..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;
  if (!drift) return null;

  const monitorName =
    monitors?.find((m) => m.id === drift.monitorId)?.displayName ||
    drift.monitorId;

  return (
    <div>
      <Link
        to="/drifts"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Drifts
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {getResourceShortName(drift.resourceType)}
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            {getWorkloadFromType(drift.resourceType)} &bull; {drift.resourceType}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={drift.changeType} />
          <StatusBadge status={drift.status} />
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Detected
          </div>
          <div className="text-sm text-gray-200">
            {formatDate(drift.detectedDateTime)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Change Type
          </div>
          <div className="text-sm text-gray-200 capitalize">
            {drift.changeType}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Monitor
          </div>
          <Link
            to={`/monitors/${drift.monitorId}`}
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            {monitorName}
          </Link>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Resource ID
          </div>
          <div className="text-xs text-gray-400 font-mono break-all">
            {drift.resourceId}
          </div>
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">
            Configuration Changes
          </h2>
        </div>
        <div className="p-6">
          <JsonDiffViewer
            previous={drift.previousValue}
            current={drift.currentValue}
            driftedProperties={drift.driftedProperties}
          />
        </div>
      </div>
    </div>
  );
}
