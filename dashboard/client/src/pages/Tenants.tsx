import { useState } from "react";
import {
  Building2,
  Plus,
  Trash2,
  Star,
  Plug,
  Loader2,
  CheckCircle2,
  XCircle,
  Pencil,
} from "lucide-react";
import {
  useTenants,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useSetDefaultTenant,
  useTestTenantConnection,
} from "../api/tenants";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { ErrorDisplay } from "../components/shared/ErrorDisplay";
import type { TenantRegistration, TenantTestResult } from "../types";

const COLORS = [
  { value: "blue", label: "Blue", cls: "bg-blue-500" },
  { value: "green", label: "Green", cls: "bg-emerald-500" },
  { value: "purple", label: "Purple", cls: "bg-purple-500" },
  { value: "orange", label: "Orange", cls: "bg-orange-500" },
  { value: "red", label: "Red", cls: "bg-red-500" },
  { value: "cyan", label: "Cyan", cls: "bg-cyan-500" },
  { value: "pink", label: "Pink", cls: "bg-pink-500" },
  { value: "yellow", label: "Yellow", cls: "bg-yellow-500" },
];

function getTenantColorCls(color?: string): string {
  return COLORS.find((c) => c.value === color)?.cls ?? "bg-gray-500";
}

export function Tenants() {
  const { data: tenants, isLoading, error, refetch } = useTenants();
  const createMutation = useCreateTenant();
  const updateMutation = useUpdateTenant();
  const deleteMutation = useDeleteTenant();
  const setDefaultMutation = useSetDefaultTenant();
  const testMutation = useTestTenantConnection();

  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TenantTestResult>>({});

  const [newName, setNewName] = useState("");
  const [newTenantId, setNewTenantId] = useState("");
  const [newColor, setNewColor] = useState("blue");

  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  if (isLoading) return <LoadingSpinner message="Loading tenants..." />;
  if (error) return <ErrorDisplay message={error.message} onRetry={() => refetch()} />;

  const handleAdd = async () => {
    try {
      await createMutation.mutateAsync({
        displayName: newName,
        tenantId: newTenantId,
        color: newColor,
      });
      setShowAdd(false);
      setNewName("");
      setNewTenantId("");
      setNewColor("blue");
    } catch {
      // error shown via mutation state
    }
  };

  const handleEdit = async (id: string) => {
    try {
      await updateMutation.mutateAsync({
        id,
        input: { displayName: editName, color: editColor },
      });
      setEditingId(null);
    } catch {
      // error shown via mutation state
    }
  };

  const handleDelete = async (tenant: TenantRegistration) => {
    if (!confirm(`Delete tenant "${tenant.displayName}"? This cannot be undone.`)) return;
    await deleteMutation.mutateAsync(tenant.id);
  };

  const handleTest = async (id: string) => {
    const result = await testMutation.mutateAsync(id);
    setTestResults((prev) => ({ ...prev, [id]: result }));
  };

  const startEdit = (tenant: TenantRegistration) => {
    setEditingId(tenant.id);
    setEditName(tenant.displayName);
    setEditColor(tenant.color || "blue");
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between animate-in animate-in-1">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-100">Tenants</h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Manage Microsoft 365 tenant registrations
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Tenant
        </button>
      </div>

      {/* Add Tenant Form */}
      {showAdd && (
        <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/[0.03] p-6 animate-in animate-in-1">
          <h3 className="mb-4 text-[13px] font-semibold text-gray-200">Register New Tenant</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Display Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Contoso Production"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Azure AD Tenant ID
              </label>
              <input
                type="text"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 placeholder:text-gray-600 focus:border-blue-500/50 focus:outline-none font-mono transition-colors"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`h-7 w-7 rounded-full ${c.cls} transition-all ${
                    newColor === c.value
                      ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--surface-1)] scale-110"
                      : "opacity-40 hover:opacity-70"
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={handleAdd}
              disabled={!newName || !newTenantId || createMutation.isPending}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm shadow-blue-500/20 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Register Tenant
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg px-4 py-2.5 text-[13px] text-gray-500 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            {createMutation.isError && (
              <span className="text-xs text-red-400">{createMutation.error.message}</span>
            )}
          </div>
        </div>
      )}

      {/* Tenant List */}
      {!tenants || tenants.length === 0 ? (
        <div className="card-surface rounded-xl px-6 py-14 text-center">
          <div className="mx-auto w-fit rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
            <Building2 className="h-8 w-8 text-gray-600" />
          </div>
          <p className="mt-4 text-[13px] font-medium text-gray-400">No tenants registered yet.</p>
          <p className="mt-1 text-xs text-gray-600">
            Add your first tenant to get started with multi-tenant monitoring.
          </p>
        </div>
      ) : (
        <div className="space-y-2 animate-in animate-in-2">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="card-surface rounded-xl transition-all"
            >
              {editingId === tenant.id ? (
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-200 focus:border-blue-500/50 focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                        Color
                      </label>
                      <div className="flex gap-2 pt-1">
                        {COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setEditColor(c.value)}
                            className={`h-6 w-6 rounded-full ${c.cls} transition-all ${
                              editColor === c.value
                                ? "ring-2 ring-white ring-offset-2 ring-offset-[var(--surface-1)] scale-110"
                                : "opacity-40 hover:opacity-70"
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleEdit(tenant.id)}
                      disabled={updateMutation.isPending}
                      className="rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50 transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-3.5 py-2 text-xs text-gray-500 hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-4 p-5">
                  <div className={`h-3.5 w-3.5 shrink-0 rounded-full ${getTenantColorCls(tenant.color)} shadow-sm`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-gray-200">
                        {tenant.displayName}
                      </span>
                      {tenant.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
                          <Star className="h-2.5 w-2.5" /> Default
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-gray-600">
                      {tenant.tenantId}
                    </div>
                  </div>

                  {/* Test result */}
                  {testResults[tenant.id] && (
                    <div className="flex items-center gap-1.5">
                      {testResults[tenant.id].success ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                      <span className={`text-xs max-w-xs truncate font-medium ${testResults[tenant.id].success ? "text-emerald-400" : "text-red-400"}`} title={testResults[tenant.id].message}>
                        {testResults[tenant.id].success
                          ? (testResults[tenant.id].organization || "OK")
                          : (testResults[tenant.id].message || "Failed")}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => handleTest(tenant.id)}
                      disabled={testMutation.isPending}
                      className="rounded-lg p-2 text-gray-600 hover:bg-white/[0.04] hover:text-gray-300 transition-colors"
                      title="Test connection"
                    >
                      {testMutation.isPending && testMutation.variables === tenant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plug className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => startEdit(tenant)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-white/[0.04] hover:text-gray-300 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!tenant.isDefault && (
                      <button
                        onClick={() => setDefaultMutation.mutate(tenant.id)}
                        className="rounded-lg p-2 text-gray-600 hover:bg-white/[0.04] hover:text-amber-400 transition-colors"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(tenant)}
                      className="rounded-lg p-2 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
