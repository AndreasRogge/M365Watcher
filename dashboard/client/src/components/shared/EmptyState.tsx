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
        "card-surface flex flex-col items-center justify-center rounded-xl py-16 px-6",
        className
      )}
    >
      <div className="rounded-xl bg-white/[0.03] p-4 ring-1 ring-white/[0.06]">
        <Icon className="h-7 w-7 text-gray-500" />
      </div>
      <h3 className="mt-5 text-[15px] font-semibold text-gray-200">{title}</h3>
      <p className="mt-1.5 text-[13px] text-gray-500 text-center max-w-sm leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
