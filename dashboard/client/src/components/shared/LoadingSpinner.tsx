import { cn } from "../../lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  message?: string;
}

export function LoadingSpinner({ className, message }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16", className)}>
      <svg
        className="custom-spinner h-8 w-8 animate-spin"
        viewBox="0 0 50 50"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-blue-500"
        />
      </svg>
      {message && (
        <p className="mt-4 text-[13px] font-medium text-gray-500 animate-in animate-in-1">
          {message}
        </p>
      )}
    </div>
  );
}
