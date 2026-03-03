import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  variant = "danger",
  loading = false,
}: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isLoading = loading || internalLoading;

  const btnClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-500 text-white shadow-sm shadow-red-500/20"
      : "bg-amber-600 hover:bg-amber-500 text-white shadow-sm shadow-amber-500/20";

  const handleConfirm = async () => {
    setError(null);
    setInternalLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed. Please try again.");
    } finally {
      setInternalLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-white/[0.08] bg-[var(--surface-2)] p-6 shadow-2xl shadow-black/50 animate-in animate-in-1">
        <button
          onClick={handleClose}
          disabled={isLoading}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-red-500/10 p-2.5 ring-1 ring-red-500/20">
            <AlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-gray-100">{title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-gray-400">{description}</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/8 border border-red-500/20 px-3.5 py-2.5 text-[13px] text-red-400">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-gray-400 hover:bg-white/[0.06] hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all disabled:opacity-50 ${btnClass}`}
          >
            {isLoading ? "Processing..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
