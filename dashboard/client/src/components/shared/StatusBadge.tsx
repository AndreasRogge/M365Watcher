import { cn } from "../../lib/utils";

type StatusType =
  | "succeeded"
  | "failed"
  | "inProgress"
  | "active"
  | "resolved"
  | "added"
  | "modified"
  | "deleted";

const statusConfig: Record<
  StatusType,
  { label: string; className: string; glow: string; dot?: string }
> = {
  succeeded: {
    label: "Succeeded",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    glow: "glow-badge-green",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "glow-badge-red",
  },
  inProgress: {
    label: "In Progress",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    glow: "glow-badge-amber",
    dot: "bg-amber-400",
  },
  active: {
    label: "Active",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "glow-badge-red",
    dot: "bg-red-400",
  },
  resolved: {
    label: "Resolved",
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    glow: "glow-badge-green",
  },
  added: {
    label: "Added",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    glow: "glow-badge-blue",
  },
  modified: {
    label: "Modified",
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    glow: "glow-badge-amber",
  },
  deleted: {
    label: "Deleted",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
    glow: "glow-badge-red",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    label: status,
    className: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    glow: "",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-wide",
        config.className,
        config.glow,
        className
      )}
    >
      {config.dot && (
        <span className="relative mr-1.5 flex h-1.5 w-1.5">
          <span className={cn("absolute inset-0 rounded-full animate-ping opacity-40", config.dot)} />
          <span className={cn("relative inline-flex h-1.5 w-1.5 rounded-full", config.dot)} />
        </span>
      )}
      {config.label}
    </span>
  );
}
