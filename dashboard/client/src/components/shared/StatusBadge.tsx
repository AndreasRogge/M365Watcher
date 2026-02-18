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
  { label: string; className: string }
> = {
  succeeded: {
    label: "Succeeded",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  inProgress: {
    label: "In Progress",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  active: {
    label: "Active",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
  resolved: {
    label: "Resolved",
    className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  },
  added: {
    label: "Added",
    className: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  },
  modified: {
    label: "Modified",
    className: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  },
  deleted: {
    label: "Deleted",
    className: "bg-red-500/15 text-red-400 border-red-500/30",
  },
};

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as StatusType] || {
    label: status,
    className: "bg-gray-500/15 text-gray-400 border-gray-500/30",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {status === "inProgress" && (
        <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
      )}
      {config.label}
    </span>
  );
}
