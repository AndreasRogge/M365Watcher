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
      <div className="flex items-center justify-between mb-6 animate-in animate-in-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Monitors</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Configuration monitors run every 6 hours (max 30 per tenant)
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Create Monitor
        </button>
      </div>

      {!monitors || monitors.length === 0 ? (
        <EmptyState
          icon={MonitorIcon}
          title="No monitors yet"
          description="Create a monitor from a succeeded snapshot to start tracking configuration drift."
          action={
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500"
            >
              <Plus className="h-4 w-4" />
              Create Monitor
            </button>
          }
        />
      ) : (
        <div className="card-surface rounded-xl overflow-hidden animate-in animate-in-2">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Last Result</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Drifts</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {monitors.map((monitor) => (
                <tr key={monitor.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3.5">
                    <div className="text-[13px] font-medium text-gray-200">{monitor.displayName}</div>
                    {monitor.description && (
                      <div className="text-xs text-gray-600 mt-0.5">{monitor.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-3.5 text-[13px] tabular-nums text-gray-500">
                    {formatDate(monitor.createdDateTime)}
                  </td>
                  <td className="px-6 py-3.5">
                    {monitor.lastMonitoringResult ? (
                      <StatusBadge status={monitor.lastMonitoringResult.status} />
                    ) : (
                      <span className="text-xs text-gray-600">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    {monitor.lastMonitoringResult?.driftDetected ? (
                      <span className="text-[13px] font-semibold text-red-400">
                        {monitor.lastMonitoringResult.driftCount}
                      </span>
                    ) : (
                      <span className="text-[13px] text-gray-600">0</span>
                    )}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        to={`/monitors/${monitor.id}`}
                        className="rounded-lg p-2 text-gray-500 hover:bg-white/[0.04] hover:text-gray-300 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setUpdateBaselineTarget(monitor.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-amber-500/10 hover:text-amber-400 transition-colors"
                        title="Update baseline"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(monitor.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-red-500/10 hover:text-red-400 transition-colors"
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[var(--surface-2)] p-6 shadow-2xl shadow-black/50 animate-in animate-in-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold tracking-tight text-gray-100">Create Monitor</h2>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300">
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-1.5">
                  Display Name * <span className="text-gray-600 font-normal">(8-32 chars)</span>
                </label>
                <input
                  type="text"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="e.g. Exchange Security Monitor"
                  maxLength={32}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
                />
                <div className="mt-1 text-[11px] text-gray-600">{form.displayName.length}/32 characters</div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 placeholder-gray-600 focus:border-blue-500/50 focus:outline-none resize-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-gray-300 mb-1.5">Baseline Snapshot *</label>
                {succeededSnapshots.length === 0 ? (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3.5 py-2.5 text-[13px] text-amber-400">
                    No succeeded snapshots available. Create a snapshot first.
                  </div>
                ) : (
                  <select
                    value={form.baselineSnapshotId}
                    onChange={(e) => setForm({ ...form, baselineSnapshotId: e.target.value })}
                    className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 focus:border-blue-500/50 focus:outline-none transition-colors"
                  >
                    <option value="">Select a snapshot...</option>
                    {succeededSnapshots.map((s) => (
                      <option key={s.id} value={s.id}>{s.displayName} ({formatDate(s.createdDateTime)})</option>
                    ))}
                  </select>
                )}
              </div>
              {formError && (
                <div className="rounded-lg bg-red-500/8 border border-red-500/20 px-3.5 py-2.5 text-[13px] text-red-400">{formError}</div>
              )}
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors">Cancel</button>
              <button onClick={handleCreate} disabled={createMutation.isPending} className="rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 transition-all">
                {createMutation.isPending ? "Creating..." : "Create Monitor"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Baseline Dialog */}
      {updateBaselineTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setUpdateBaselineTarget(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[var(--surface-2)] p-6 shadow-2xl shadow-black/50 animate-in animate-in-1">
            <h2 className="text-[15px] font-semibold text-gray-100 mb-2">Update Baseline</h2>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3.5 py-2.5 text-[13px] text-amber-400 mb-4">
              Warning: Updating the baseline will delete all previous drift records for this monitor!
            </div>
            <select
              value={updateSnapshotId}
              onChange={(e) => setUpdateSnapshotId(e.target.value)}
              className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 focus:border-blue-500/50 focus:outline-none mb-4 transition-colors"
            >
              <option value="">Select new baseline snapshot...</option>
              {succeededSnapshots.map((s) => (
                <option key={s.id} value={s.id}>{s.displayName} ({formatDate(s.createdDateTime)})</option>
              ))}
            </select>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setUpdateBaselineTarget(null); setUpdateSnapshotId(""); }} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors">Cancel</button>
              <button
                onClick={async () => {
                  if (updateBaselineTarget && updateSnapshotId) {
                    await updateBaselineMutation.mutateAsync({ monitorId: updateBaselineTarget, newBaselineSnapshotId: updateSnapshotId });
                    setUpdateBaselineTarget(null);
                    setUpdateSnapshotId("");
                  }
                }}
                disabled={!updateSnapshotId || updateBaselineMutation.isPending}
                className="rounded-lg bg-amber-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-amber-500/20 hover:bg-amber-500 disabled:opacity-50 transition-all"
              >
                {updateBaselineMutation.isPending ? "Updating..." : "Update Baseline"}
              </button>
            </div>
          </div>
        </div>
      )}

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
