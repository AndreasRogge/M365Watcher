import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useSnapshot } from "../api/snapshots";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { formatDate, getWorkloadFromType, getResourceShortName } from "../lib/utils";

export function SnapshotDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: snapshot, isLoading, error, refetch } = useSnapshot(id!);

  if (isLoading) return <LoadingSpinner message="Loading snapshot..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;
  if (!snapshot) return null;

  // Group resources by workload
  const grouped: Record<string, string[]> = {};
  (snapshot.resources || []).forEach((r) => {
    const workload = getWorkloadFromType(r);
    if (!grouped[workload]) grouped[workload] = [];
    grouped[workload].push(r);
  });

  return (
    <div>
      <Link
        to="/snapshots"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Snapshots
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            {snapshot.displayName}
          </h1>
          {snapshot.description && (
            <p className="mt-1 text-sm text-gray-400">
              {snapshot.description}
            </p>
          )}
        </div>
        <StatusBadge status={snapshot.status} />
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Created
          </div>
          <div className="text-sm text-gray-200">
            {formatDate(snapshot.createdDateTime)}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Resource Count
          </div>
          <div className="text-sm text-gray-200">
            {snapshot.resourceCount ?? snapshot.resources?.length ?? "-"}
          </div>
        </div>
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
            Snapshot ID
          </div>
          <div className="text-xs text-gray-400 font-mono break-all">
            {snapshot.id}
          </div>
        </div>
      </div>

      {/* Resource Types by Workload */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="border-b border-gray-800 px-6 py-4">
          <h2 className="text-sm font-semibold text-gray-200">
            Monitored Resource Types
          </h2>
        </div>
        <div className="divide-y divide-gray-800">
          {Object.entries(grouped).map(([workload, types]) => (
            <div key={workload} className="px-6 py-4">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                {workload} ({types.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {types.map((type) => (
                  <span
                    key={type}
                    className="inline-flex rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs font-mono text-gray-300"
                  >
                    {getResourceShortName(type)}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
