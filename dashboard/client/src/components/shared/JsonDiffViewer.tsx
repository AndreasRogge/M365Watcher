import { cn } from "../../lib/utils";

interface JsonDiffViewerProps {
  previous?: Record<string, unknown>;
  current?: Record<string, unknown>;
  driftedProperties?: Array<{
    propertyName: string;
    desiredValue: unknown;
    detectedValue: unknown;
  }>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export function JsonDiffViewer({
  previous,
  current,
  driftedProperties,
}: JsonDiffViewerProps) {
  // If we have driftedProperties (structured diff from API), show those
  if (driftedProperties && driftedProperties.length > 0) {
    return (
      <div className="space-y-3">
        {driftedProperties.map((prop, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-gray-700 bg-gray-800/50 overflow-hidden"
          >
            <div className="border-b border-gray-700 bg-gray-800 px-4 py-2">
              <span className="text-sm font-mono font-medium text-gray-200">
                {prop.propertyName}
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-gray-700">
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-red-400 uppercase tracking-wide">
                  Expected (Baseline)
                </div>
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all bg-red-500/5 rounded p-2 border border-red-500/10">
                  {formatValue(prop.desiredValue)}
                </pre>
              </div>
              <div className="p-4">
                <div className="mb-2 text-xs font-medium text-emerald-400 uppercase tracking-wide">
                  Detected (Current)
                </div>
                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap break-all bg-emerald-500/5 rounded p-2 border border-emerald-500/10">
                  {formatValue(prop.detectedValue)}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Fallback: raw before/after comparison
  if (!previous && !current) {
    return (
      <p className="text-sm text-gray-500">
        No detailed diff data available.
      </p>
    );
  }

  // Find all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(previous || {}),
    ...Object.keys(current || {}),
  ]);

  const changes: Array<{
    key: string;
    oldVal: unknown;
    newVal: unknown;
    type: "added" | "removed" | "changed" | "unchanged";
  }> = [];

  for (const key of allKeys) {
    const oldVal = previous?.[key];
    const newVal = current?.[key];
    const oldStr = JSON.stringify(oldVal);
    const newStr = JSON.stringify(newVal);

    if (oldVal === undefined) {
      changes.push({ key, oldVal, newVal, type: "added" });
    } else if (newVal === undefined) {
      changes.push({ key, oldVal, newVal, type: "removed" });
    } else if (oldStr !== newStr) {
      changes.push({ key, oldVal, newVal, type: "changed" });
    } else {
      changes.push({ key, oldVal, newVal, type: "unchanged" });
    }
  }

  // Sort: changed first, then added, removed, unchanged
  const order = { changed: 0, added: 1, removed: 2, unchanged: 3 };
  changes.sort((a, b) => order[a.type] - order[b.type]);

  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-800 border-b border-gray-700">
            <th className="text-left px-4 py-2 text-gray-400 font-medium">
              Property
            </th>
            <th className="text-left px-4 py-2 text-gray-400 font-medium">
              Previous
            </th>
            <th className="text-left px-4 py-2 text-gray-400 font-medium">
              Current
            </th>
          </tr>
        </thead>
        <tbody>
          {changes.map(({ key, oldVal, newVal, type }) => (
            <tr
              key={key}
              className={cn(
                "border-b border-gray-800 last:border-0",
                type === "changed" && "bg-amber-500/5",
                type === "added" && "bg-emerald-500/5",
                type === "removed" && "bg-red-500/5"
              )}
            >
              <td className="px-4 py-2 font-mono text-gray-300 align-top">
                {key}
                {type !== "unchanged" && (
                  <span
                    className={cn(
                      "ml-2 text-[10px] uppercase font-sans",
                      type === "changed" && "text-amber-400",
                      type === "added" && "text-emerald-400",
                      type === "removed" && "text-red-400"
                    )}
                  >
                    {type}
                  </span>
                )}
              </td>
              <td className="px-4 py-2 font-mono text-gray-400 align-top whitespace-pre-wrap break-all max-w-xs">
                {formatValue(oldVal)}
              </td>
              <td className="px-4 py-2 font-mono text-gray-400 align-top whitespace-pre-wrap break-all max-w-xs">
                {formatValue(newVal)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
