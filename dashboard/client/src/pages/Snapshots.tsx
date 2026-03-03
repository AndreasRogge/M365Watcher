import { useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Plus, Trash2, Eye, X } from "lucide-react";
import {
  useSnapshots,
  useCreateSnapshot,
  useDeleteSnapshot,
} from "../api/snapshots";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { EmptyState } from "../components/shared/EmptyState";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ResourceTypePicker } from "../components/shared/ResourceTypePicker";
import { formatDate } from "../lib/utils";

export function Snapshots() {
  const { data: snapshots, isLoading, error, refetch } = useSnapshots();
  const createMutation = useCreateSnapshot();
  const deleteMutation = useDeleteSnapshot();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    description: "",
    resources: [] as string[],
  });
  const [formError, setFormError] = useState("");

  const handleCreate = async () => {
    setFormError("");
    if (!form.displayName.trim()) {
      setFormError("Display name is required");
      return;
    }
    if (!/^[a-zA-Z0-9 ]+$/.test(form.displayName)) {
      setFormError("Display name can only contain letters, numbers, and spaces");
      return;
    }
    if (form.resources.length === 0) {
      setFormError("Select at least one resource type");
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      setShowCreate(false);
      setForm({ displayName: "", description: "", resources: [] });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create snapshot");
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading snapshots..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-in animate-in-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Snapshots</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Point-in-time configuration captures (auto-deleted after 7 days)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Snapshot
        </button>
      </div>

      {/* Snapshots Table */}
      {!snapshots || snapshots.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="No snapshots yet"
          description="Create your first snapshot to capture your tenant's current configuration state."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Create Snapshot
            </button>
          }
        />
      ) : (
        <div className="card-surface rounded-xl overflow-hidden animate-in animate-in-2">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Resources
                </th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <div className="text-[13px] font-medium text-gray-200">
                      {snapshot.displayName}
                    </div>
                    {snapshot.description && (
                      <div className="text-xs text-gray-600 mt-0.5">
                        {snapshot.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <StatusBadge status={snapshot.status} />
                  </td>
                  <td className="px-6 py-3.5 text-[13px] tabular-nums text-gray-500">
                    {formatDate(snapshot.createdDateTime)}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] tabular-nums text-gray-500">
                    {snapshot.resourceCount ?? snapshot.resources?.length ?? "-"}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/snapshots/${snapshot.id}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-white/[0.04] hover:text-gray-300 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(snapshot.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Snapshot Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[var(--surface-2)] p-6 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto animate-in animate-in-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-gray-100">
                Create Snapshot
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  placeholder="e.g. Exchange Security Baseline"
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 focus:border-blue-500/50 focus:outline-none resize-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                  Resource Types *
                </label>
                <ResourceTypePicker
                  selected={form.resources}
                  onChange={(resources) => setForm({ ...form, resources })}
                />
              </div>

              {formError && (
                <div className="rounded-lg bg-red-500/8 border border-red-500/20 px-3.5 py-2.5 text-[13px] text-red-400">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition-all"
              >
                {createMutation.isPending
                  ? "Creating..."
                  : "Create Snapshot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await deleteMutation.mutateAsync(deleteId);
            setDeleteId(null);
          }
        }}
        title="Delete Snapshot"
        description="Are you sure you want to delete this snapshot? This action cannot be undone. Any monitors using this snapshot as a baseline will not be affected."
        confirmLabel="Delete"
      />
    </div>
  );
}
