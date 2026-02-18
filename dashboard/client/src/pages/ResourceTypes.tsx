import { useState } from "react";
import {
  Search,
  Shield,
  Mail,
  Smartphone,
  Lock,
  MessageSquare,
  Blocks,
} from "lucide-react";
import { useResourceTypes } from "../api/resourceTypes";
import { LoadingSpinner } from "../components/shared/LoadingSpinner";
import { cn } from "../lib/utils";
import type { LucideIcon } from "lucide-react";

const workloadIcons: Record<string, LucideIcon> = {
  Shield,
  Mail,
  Smartphone,
  Lock,
  MessageSquare,
};

const workloadColors: Record<string, string> = {
  entra: "border-blue-500/30 bg-blue-500/5",
  exchange: "border-purple-500/30 bg-purple-500/5",
  intune: "border-emerald-500/30 bg-emerald-500/5",
  security: "border-red-500/30 bg-red-500/5",
  teams: "border-amber-500/30 bg-amber-500/5",
};

const workloadTextColors: Record<string, string> = {
  entra: "text-blue-400",
  exchange: "text-purple-400",
  intune: "text-emerald-400",
  security: "text-red-400",
  teams: "text-amber-400",
};

export function ResourceTypes() {
  const { data: catalog, isLoading } = useResourceTypes();
  const [search, setSearch] = useState("");

  if (isLoading) return <LoadingSpinner message="Loading resource types..." />;
  if (!catalog) return null;

  const totalTypes = Object.values(catalog).reduce(
    (sum, w) => sum + w.types.length,
    0
  );

  const filteredCatalog = Object.entries(catalog)
    .map(([key, workload]) => ({
      key,
      ...workload,
      filteredTypes: search
        ? workload.types.filter((t) =>
            t.toLowerCase().includes(search.toLowerCase())
          )
        : workload.types,
    }))
    .filter((w) => w.filteredTypes.length > 0);

  const filteredTotal = filteredCatalog.reduce(
    (sum, w) => sum + w.filteredTypes.length,
    0
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-100">Resource Types</h1>
        <p className="mt-1 text-sm text-gray-400">
          {totalTypes} verified resource types across 5 Microsoft 365 workloads
        </p>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-3 mb-6">
        <Search className="h-5 w-5 text-gray-500" />
        <input
          type="text"
          placeholder="Search resource types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {filteredTotal} types
        </span>
      </div>

      {/* Workload Sections */}
      {filteredCatalog.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Blocks className="h-8 w-8 text-gray-600" />
          <p className="mt-3 text-sm text-gray-500">
            No resource types match your search
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCatalog.map(({ key, label, icon, filteredTypes }) => {
            const Icon = workloadIcons[icon] || Shield;
            return (
              <div
                key={key}
                className={cn(
                  "rounded-xl border p-6",
                  workloadColors[key] || "border-gray-800 bg-gray-900/50"
                )}
              >
                <div className="flex items-center gap-3 mb-4">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      workloadTextColors[key] || "text-gray-400"
                    )}
                  />
                  <h2 className="text-lg font-semibold text-gray-100">
                    {label}
                  </h2>
                  <span className="text-sm text-gray-500">
                    ({filteredTypes.length} types)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {filteredTypes.map((type) => {
                    const shortName = type.split(".").pop() || type;
                    return (
                      <div
                        key={type}
                        className="rounded-md border border-gray-700/50 bg-gray-800/50 px-3 py-2"
                      >
                        <div className="text-sm font-mono text-gray-200">
                          {shortName}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          {type}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
