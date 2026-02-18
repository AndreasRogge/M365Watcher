import { cn } from "../../lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900/50 py-16 px-6",
        className
      )}
    >
      <div className="rounded-full bg-gray-800 p-4">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-gray-200">{title}</h3>
      <p className="mt-1 text-sm text-gray-400 text-center max-w-sm">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
