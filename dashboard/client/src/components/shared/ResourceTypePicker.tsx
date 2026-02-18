import { useState } from "react";
import {
  Search,
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Square,
  Shield,
  Mail,
  Smartphone,
  Lock,
  MessageSquare,
} from "lucide-react";
import { useResourceTypes } from "../../api/resourceTypes";
import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";

const workloadIcons: Record<string, LucideIcon> = {
  Shield,
  Mail,
  Smartphone,
  Lock,
  MessageSquare,
};

interface ResourceTypePickerProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function ResourceTypePicker({
  selected,
  onChange,
}: ResourceTypePickerProps) {
  const { data: catalog } = useResourceTypes();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (!catalog) return null;

  const toggleWorkload = (workloadKey: string) => {
    setExpanded((prev) => ({ ...prev, [workloadKey]: !prev[workloadKey] }));
  };

  const selectAllInWorkload = (types: string[]) => {
    const allSelected = types.every((t) => selected.includes(t));
    if (allSelected) {
      onChange(selected.filter((s) => !types.includes(s)));
    } else {
      const newSelected = new Set([...selected, ...types]);
      onChange([...newSelected]);
    }
  };

  const toggleType = (type: string) => {
    if (selected.includes(type)) {
      onChange(selected.filter((s) => s !== type));
    } else {
      onChange([...selected, type]);
    }
  };

  const filteredCatalog = Object.entries(catalog).map(
    ([key, workload]) => ({
      key,
      ...workload,
      filteredTypes: search
        ? workload.types.filter((t) =>
            t.toLowerCase().includes(search.toLowerCase())
          )
        : workload.types,
    })
  ).filter((w) => w.filteredTypes.length > 0);

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50">
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-gray-700 px-3 py-2">
        <Search className="h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search resource types..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-sm text-gray-200 placeholder-gray-500 outline-none"
        />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {selected.length} selected
        </span>
      </div>

      {/* Workload groups */}
      <div className="max-h-64 overflow-y-auto">
        {filteredCatalog.map(({ key, label, icon, filteredTypes }) => {
          const Icon = workloadIcons[icon] || Shield;
          const allSelected = filteredTypes.every((t) =>
            selected.includes(t)
          );
          const someSelected = filteredTypes.some((t) =>
            selected.includes(t)
          );
          const isExpanded = expanded[key] ?? false;

          return (
            <div key={key} className="border-b border-gray-700/50 last:border-0">
              {/* Workload header */}
              <div
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => toggleWorkload(key)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <Icon className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-200 flex-1">
                  {label}
                </span>
                <span className="text-xs text-gray-500">
                  {filteredTypes.filter((t) => selected.includes(t)).length}/
                  {filteredTypes.length}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    selectAllInWorkload(filteredTypes);
                  }}
                  className={cn(
                    "text-xs px-2 py-0.5 rounded transition-colors",
                    allSelected
                      ? "text-blue-400 hover:text-blue-300"
                      : someSelected
                      ? "text-gray-400 hover:text-gray-300"
                      : "text-gray-500 hover:text-gray-400"
                  )}
                >
                  {allSelected ? "Deselect all" : "Select all"}
                </button>
              </div>

              {/* Resource types */}
              {isExpanded && (
                <div className="pb-1">
                  {filteredTypes.map((type) => {
                    const isSelected = selected.includes(type);
                    const shortName = type.split(".").pop() || type;
                    return (
                      <div
                        key={type}
                        onClick={() => toggleType(type)}
                        className="flex items-center gap-2 px-3 py-1 pl-10 cursor-pointer hover:bg-gray-700/20 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-3.5 w-3.5 text-blue-400" />
                        ) : (
                          <Square className="h-3.5 w-3.5 text-gray-600" />
                        )}
                        <span
                          className={cn(
                            "text-xs font-mono",
                            isSelected ? "text-gray-200" : "text-gray-400"
                          )}
                        >
                          {shortName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
