import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "../../lib/utils";

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorDisplay({ message, onRetry, className }: ErrorDisplayProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-red-500/20 bg-red-500/[0.03] py-14 px-6",
        className
      )}
    >
      <div className="rounded-xl bg-red-500/10 p-3 ring-1 ring-red-500/20">
        <AlertTriangle className="h-6 w-6 text-red-400" />
      </div>
      <p className="mt-4 text-[13px] text-red-300 text-center max-w-md leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2.5 text-[13px] font-medium text-red-400 hover:bg-red-500/15 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
