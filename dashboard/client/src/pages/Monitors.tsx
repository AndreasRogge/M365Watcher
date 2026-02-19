import { useState } from "react";
import { Link } from "react-router-dom";
import { Monitor as MonitorIcon, Plus, Trash2, Eye, RefreshCw, X } from "lucide-react";
import {
  useMonitors,
  useCreateMonitor,
  useDeleteMonitor,
  useUpdateMonitorBaseline,
} from "../api/monitors";
import { useSnapshots } from "../api/snapshots";
import { StatusBadge } from "../components/shared/StatusBadge";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import { EmptyState } from "../components/shared/EmptyState";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { formatDate } from "../lib/utils";

export function Monitors() {
  const { data: monitors, isLoading, error, refetch } = useMonitors();
  const { data: snapshots } = useSnapshots();
  const createMutation = useCreateMonitor();
  const deleteMutation = useDeleteMonitor();
  const updateBaselineMutation = useUpdateMonitorBaseline();

  const [showCreate, setShowCreate] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updateBaselineTarget, setUpdateBaselineTarget] = useState<string | null>(null);
  const [form, setForm] = useState({
    displayName: "",
    description: "",
    baselineSnapshotId: "",
  });
  const [updateSnapshotId, setUpdateSnapshotId] = useState("");
  const [formError, setFormError] = useState("");

  const succeededSnapshots = snapshots?.filter((s) => s.status === "succeeded") || [];

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
    if (form.displayName.length < 8 || form.displayName.length > 32) {
      setFormError("Display name must be 8-32 characters");
      return;
    }
    if (!form.baselineSnapshotId) {
      setFormError("Select a baseline snapshot");
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      setShowCreate(false);
      setForm({ displayName: "", description: "", baselineSnapshotId: "" });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create monitor");
    }
  };

  if (isLoading) return <LoadingSpinner message="Loading monitors..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Monitors</h1>
          <p className="mt-1 text-sm text-gray-400">
            Configuration monitors run every 6 hours (max 30 per tenant)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Monitor
        </button>
      </div>

      {/* Monitors Table */}
      {!monitors || monitors.length === 0 ? (
        <EmptyState
          icon={MonitorIcon}
          title="No monitors yet"
          description="Create a monitor from a succeeded snapshot to start tracking configuration drift."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Monitor
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
                  Created
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Last Result
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Drifts
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {monitors.map((monitor) => (
                <tr
                  key={monitor.id}
                  className="hover:bg-gray-800/30 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-200">
                      {monitor.displayName}
                    </div>
                    {monitor.description && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {monitor.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {formatDate(monitor.createdDateTime)}
                  </td>
                  <td className="px-6 py-4">
                    {monitor.lastMonitoringResult ? (
                      <StatusBadge
                        status={monitor.lastMonitoringResult.status}
                      />
                    ) : (
                      <span className="text-xs text-gray-500">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {monitor.lastMonitoringResult?.driftDetected ? (
                      <span className="text-sm font-medium text-red-400">
                        {monitor.lastMonitoringResult.driftCount}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500">0</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/monitors/${monitor.id}`}
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-700 hover:text-gray-200 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() =>
                          setUpdateBaselineTarget(monitor.id)
                        }
                        className="rounded p-1.5 text-gray-400 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                        title="Update baseline"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(monitor.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete monitor"
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

      {/* Create Monitor Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-100">
                Create Monitor
              </h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Display Name * <span className="text-gray-500 font-normal">(8-32 chars)</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Exchange Security Monitor"
                  maxLength={32}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                />
                <div className="mt-1 text-xs text-gray-500">
                  {form.displayName.length}/32 characters
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  Baseline Snapshot *
                </label>
                {succeededSnapshots.length === 0 ? (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-400">
                    No succeeded snapshots available. Create a snapshot first.
                  </div>
                ) : (
                  <select
                    value={form.baselineSnapshotId}
                    onChange={(e) => setForm({ ...form, baselineSnapshotId: e.target.value })}
                    className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select a snapshot...</option>
                    {succeededSnapshots.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName} ({formatDate(s.createdDateTime)})
                      </option>
                    ))}
                  </select>
                )}
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
                {createMutation.isPending ? "Creating..." : "Create Monitor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Baseline Dialog */}
      {updateBaselineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setUpdateBaselineTarget(null)} />
          <div className="relative z-10 w-full max-w-md rounded-lg border border-gray-700 bg-gray-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-gray-100 mb-2">
              Update Baseline
            </h2>
            <div className="rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-400 mb-4">
              Warning: Updating the baseline will delete all previous drift records for this monitor!
            </div>
            <select
              value={updateSnapshotId}
              onChange={(e) => setUpdateSnapshotId(e.target.value)}
              className="w-full rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none mb-4"
            >
              <option value="">Select new baseline snapshot...</option>
              {succeededSnapshots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName} ({formatDate(s.createdDateTime)})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setUpdateBaselineTarget(null); setUpdateSnapshotId(""); }}
                className="rounded-md border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (updateBaselineTarget && updateSnapshotId) {
                    await updateBaselineMutation.mutateAsync({
                      monitorId: updateBaselineTarget,
                      newBaselineSnapshotId: updateSnapshotId,
                    });
                    setUpdateBaselineTarget(null);
                    setUpdateSnapshotId("");
                  }
                }}
                disabled={!updateSnapshotId || updateBaselineMutation.isPending}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {updateBaselineMutation.isPending ? "Updating..." : "Update Baseline"}
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
        title="Delete Monitor"
        description="Are you sure you want to delete this monitor? All associated drift records will be lost. This action cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  );
}
