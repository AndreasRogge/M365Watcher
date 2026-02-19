import { useState } from "react";
import { ChevronDown, ChevronRight, Search, Database, Copy, Check } from "lucide-react";
import type { SnapshotResource } from "../../types";
import { getWorkloadFromType, getResourceShortName, cn } from "../../lib/utils";

interface SnapshotContentsViewerProps {
  resources: SnapshotResource[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function PropertyTable({ properties }: { properties: Record<string, unknown> }) {
  const entries = Object.entries(properties).filter(
    ([key]) => !key.startsWith("@odata")
  );

  if (entries.length === 0) {
    return (
      <p className="text-xs text-gray-500 italic px-4 py-2">No properties captured</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-700 bg-gray-800/50">
            <th className="text-left px-4 py-2 text-gray-400 font-medium w-1/3">
              Property
            </th>
            <th className="text-left px-4 py-2 text-gray-400 font-medium">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key} className="border-b border-gray-800/50 last:border-0">
              <td className="px-4 py-1.5 font-mono text-gray-300 align-top">
                {key}
              </td>
              <td className="px-4 py-1.5 font-mono text-gray-400 align-top whitespace-pre-wrap break-all">
                {formatValue(value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResourceCard({ resource }: { resource: SnapshotResource }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const shortName = getResourceShortName(resource.resourceType);
  const propertyCount = Object.keys(resource.properties || {}).filter(
    (k) => !k.startsWith("@odata")
  ).length;

  const handleCopyJson = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(JSON.stringify(resource.properties, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/30 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-500 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-500 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-200 truncate">
              {resource.resourceName || shortName}
            </span>
            <span className="text-xs text-gray-500 font-mono shrink-0">
              {shortName}
            </span>
          </div>
          {resource.resourceId && (
            <div className="text-xs text-gray-500 font-mono truncate mt-0.5">
              {resource.resourceId}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500">
            {propertyCount} {propertyCount === 1 ? "property" : "properties"}
          </span>
          <button
            onClick={handleCopyJson}
            className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            title="Copy JSON"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-gray-800">
          <PropertyTable properties={resource.properties || {}} />
        </div>
      )}
    </div>
  );
}

function WorkloadGroup({
  workload,
  resources,
  defaultExpanded,
}: {
  workload: string;
  resources: SnapshotResource[];
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const workloadColors: Record<string, string> = {
    "Entra ID": "border-l-blue-500",
    "Exchange Online": "border-l-amber-500",
    Intune: "border-l-emerald-500",
    "Security & Compliance": "border-l-red-500",
    Teams: "border-l-violet-500",
  };

  const borderColor = workloadColors[workload] || "border-l-gray-500";

  return (
    <div className={cn("border-l-4 rounded-r-lg", borderColor)}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/20 transition-colors"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <span className="text-sm font-semibold text-gray-200">{workload}</span>
        <span className="text-xs text-gray-500">
          {resources.length} {resources.length === 1 ? "resource" : "resources"}
        </span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {resources.map((resource, idx) => (
            <ResourceCard key={`${resource.resourceType}-${resource.resourceId}-${idx}`} resource={resource} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SnapshotContentsViewer({ resources }: SnapshotContentsViewerProps) {
  const [search, setSearch] = useState("");

  // Group resources by workload
  const grouped: Record<string, SnapshotResource[]> = {};
  resources.forEach((r) => {
    const workload = getWorkloadFromType(r.resourceType);
    if (!grouped[workload]) grouped[workload] = [];
    grouped[workload].push(r);
  });

  // Filter by search
  const filteredGroups: Record<string, SnapshotResource[]> = {};
  const searchLower = search.toLowerCase();

  for (const [workload, items] of Object.entries(grouped)) {
    const filtered = search
      ? items.filter(
          (r) =>
            r.resourceType.toLowerCase().includes(searchLower) ||
            r.resourceName?.toLowerCase().includes(searchLower) ||
            r.resourceId?.toLowerCase().includes(searchLower) ||
            JSON.stringify(r.properties).toLowerCase().includes(searchLower)
        )
      : items;
    if (filtered.length > 0) {
      filteredGroups[workload] = filtered;
    }
  }

  const totalFiltered = Object.values(filteredGroups).reduce(
    (sum, items) => sum + items.length,
    0
  );

  // Workload sort order
  const workloadOrder = [
    "Entra ID",
    "Exchange Online",
    "Intune",
    "Security & Compliance",
    "Teams",
  ];
  const sortedWorkloads = Object.keys(filteredGroups).sort(
    (a, b) =>
      (workloadOrder.indexOf(a) === -1 ? 99 : workloadOrder.indexOf(a)) -
      (workloadOrder.indexOf(b) === -1 ? 99 : workloadOrder.indexOf(b))
  );

  return (
    <div>
      {/* Search + stats bar */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search resources, properties, values..."
            className="w-full rounded-md border border-gray-700 bg-gray-800 pl-10 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
          <Database className="h-3.5 w-3.5" />
          {search ? (
            <span>
              {totalFiltered} of {resources.length} resources
            </span>
          ) : (
            <span>{resources.length} resources</span>
          )}
        </div>
      </div>

      {/* Resource groups */}
      {sortedWorkloads.length === 0 ? (
        <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-8 text-center">
          <p className="text-sm text-gray-500">
            {search
              ? "No resources match your search."
              : "No resources found in this snapshot."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedWorkloads.map((workload, idx) => (
            <WorkloadGroup
              key={workload}
              workload={workload}
              resources={filteredGroups[workload]}
              defaultExpanded={idx === 0 && sortedWorkloads.length <= 3}
            />
          ))}
        </div>
      )}
    </div>
  );
}
