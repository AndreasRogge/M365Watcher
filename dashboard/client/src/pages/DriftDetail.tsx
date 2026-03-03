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
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-500 hover:text-gray-300 mb-5 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Drifts
      </Link>

      <div className="flex items-start justify-between mb-6 animate-in animate-in-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">
            {getResourceShortName(drift.resourceType)}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            {getWorkloadFromType(drift.resourceType)} &bull;{" "}
            <span className="font-mono text-gray-600">{drift.resourceType}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={drift.changeType} />
          <StatusBadge status={drift.status} />
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-4 gap-3 mb-8 animate-in animate-in-2">
        {[
          {
            label: "Detected",
            value: formatDate(drift.detectedDateTime),
            mono: false,
          },
          {
            label: "Change Type",
            value: drift.changeType,
            mono: false,
            capitalize: true,
          },
          {
            label: "Monitor",
            value: monitorName,
            link: `/monitors/${drift.monitorId}`,
            mono: false,
          },
          {
            label: "Resource ID",
            value: drift.resourceId,
            mono: true,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="card-surface rounded-xl p-4"
          >
            <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-600 mb-1.5">
              {item.label}
            </div>
            {item.link ? (
              <Link
                to={item.link}
                className="text-[13px] font-medium text-blue-400 hover:text-blue-300"
              >
                {item.value}
              </Link>
            ) : (
              <div
                className={`text-[13px] text-gray-300 ${
                  item.mono ? "font-mono text-xs text-gray-400 break-all" : ""
                } ${item.capitalize ? "capitalize" : ""}`}
              >
                {item.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Diff Viewer */}
      <div className="card-surface rounded-xl animate-in animate-in-3">
        <div className="border-b border-white/[0.06] px-6 py-4">
          <h2 className="text-[13px] font-semibold text-gray-200">
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
