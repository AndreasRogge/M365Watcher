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

  // Add form state
  const [newName, setNewName] = useState("");
  const [newTenantId, setNewTenantId] = useState("");
  const [newColor, setNewColor] = useState("blue");

  // Edit form state
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Tenants</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage Microsoft 365 tenant registrations
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Tenant
        </button>
      </div>

      {/* Add Tenant Form */}
      {showAdd && (
        <div className="mb-6 rounded-xl border border-blue-500/30 bg-gray-900/80 p-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-200">Register New Tenant</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Display Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Contoso Production"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">
                Azure AD Tenant ID
              </label>
              <input
                type="text"
                value={newTenantId}
                onChange={(e) => setNewTenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 placeholder:text-gray-600 focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`h-7 w-7 rounded-full ${c.cls} transition-all ${
                    newColor === c.value
                      ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                      : "opacity-50 hover:opacity-80"
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
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Register Tenant
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="rounded-lg px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
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
        <div className="rounded-xl border border-gray-800 bg-gray-900/50 px-6 py-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-gray-700" />
          <p className="mt-3 text-sm text-gray-400">No tenants registered yet.</p>
          <p className="mt-1 text-xs text-gray-600">
            Add your first tenant to get started with multi-tenant monitoring.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="rounded-xl border border-gray-800 bg-gray-900/50 transition-colors hover:border-gray-700"
            >
              {editingId === tenant.id ? (
                /* Edit Mode */
                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-gray-400">
                        Color
                      </label>
                      <div className="flex gap-2 pt-1">
                        {COLORS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => setEditColor(c.value)}
                            className={`h-6 w-6 rounded-full ${c.cls} transition-all ${
                              editColor === c.value
                                ? "ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                                : "opacity-50 hover:opacity-80"
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
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                /* Display Mode */
                <div className="flex items-center gap-4 p-5">
                  <div className={`h-4 w-4 shrink-0 rounded-full ${getTenantColorCls(tenant.color)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-200">
                        {tenant.displayName}
                      </span>
                      {tenant.isDefault && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-400">
                          <Star className="h-2.5 w-2.5" /> Default
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 font-mono text-xs text-gray-500">
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
                      <span className={`text-xs max-w-xs truncate ${testResults[tenant.id].success ? "text-emerald-400" : "text-red-400"}`} title={testResults[tenant.id].message}>
                        {testResults[tenant.id].success
                          ? (testResults[tenant.id].organization || "OK")
                          : (testResults[tenant.id].message || "Failed")}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleTest(tenant.id)}
                      disabled={testMutation.isPending}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
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
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-gray-300 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!tenant.isDefault && (
                      <button
                        onClick={() => setDefaultMutation.mutate(tenant.id)}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-yellow-400 transition-colors"
                        title="Set as default"
                      >
                        <Star className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(tenant)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-800 hover:text-red-400 transition-colors"
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
