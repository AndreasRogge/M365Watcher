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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Snapshots</h1>
          <p className="mt-1 text-sm text-gray-400">
            Point-in-time configuration captures (auto-deleted after 7 days)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
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
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Snapshot
            </button>
          }
        />
      ) : (
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-900">
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Resources
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {snapshots.map((snapshot) => (
                <tr
                  key={snapshot.id}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-200">
                      {snapshot.displayName}
                    </div>
                    {snapshot.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {snapshot.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={snapshot.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(snapshot.createdDateTime)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {snapshot.resourceCount ?? snapshot.resources?.length ?? "-"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/snapshots/${snapshot.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(snapshot.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowCreate(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-100">
                Create Snapshot
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  placeholder="e.g. Exchange Security Baseline"
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Resource Types *
                </label>
                <ResourceTypePicker
                  selected={form.resources}
                  onChange={(resources) => setForm({ ...form, resources })}
                />
              </div>

              {formError && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
                  {formError}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
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
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
