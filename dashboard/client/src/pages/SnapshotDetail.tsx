import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, FileText, List } from "lucide-react";
import { useSnapshot, useSnapshotContents } from "../api/snapshots";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { SnapshotContentsViewer } from "../components/shared/SnapshotContentsViewer";
import { formatDate, getWorkloadFromType, getResourceShortName, cn } from "../lib/utils";

export function SnapshotDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: snapshot, isLoading, error, refetch } = useSnapshot(id!);
  const [activeTab, setActiveTab] = useState<"types" | "contents">("types");

  // Lazy-load contents only when the tab is active and snapshot is succeeded
  const {
    data: contentsData,
    isLoading: contentsLoading,
    error: contentsError,
    refetch: refetchContents,
  } = useSnapshotContents(
    id!,
    activeTab === "contents" && snapshot?.status === "succeeded"
  );

  if (isLoading) return <LoadingSpinner message="Loading snapshot..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;
  if (!snapshot) return null;

  const isSucceeded = snapshot.status === "succeeded";

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

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-800 mb-6">
        <button
          onClick={() => setActiveTab("types")}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "types"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600"
          )}
        >
          <List className="h-4 w-4" />
          Resource Types
        </button>
        <button
          onClick={() => isSucceeded && setActiveTab("contents")}
          disabled={!isSucceeded}
          className={cn(
            "inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
            activeTab === "contents"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600",
            !isSucceeded && "opacity-40 cursor-not-allowed hover:text-gray-400 hover:border-transparent"
          )}
          title={!isSucceeded ? "Contents only available for succeeded snapshots" : undefined}
        >
          <FileText className="h-4 w-4" />
          Snapshot Contents
          {!isSucceeded && (
            <span className="text-xs text-gray-600">(unavailable)</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "types" && (
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
      )}

      {activeTab === "contents" && (
        <div>
          {contentsLoading && (
            <LoadingSpinner message="Loading snapshot contents from Microsoft Graph..." />
          )}
          {contentsError && (
            <ErrorDisplay
              message={contentsError.message}
              onRetry={() => refetchContents()}
            />
          )}
          {contentsData?.contents?.resources && (
            <SnapshotContentsViewer resources={contentsData.contents.resources} />
          )}
          {contentsData && !contentsData.contents?.resources?.length && !contentsLoading && (
            <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center">
              <p className="text-sm text-gray-500">
                No resource data found in this snapshot.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
