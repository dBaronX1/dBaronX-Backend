import type { DbxPaymentStatus } from "@/types/dbx/dbx-payment.types";
import { dbxPaymentUiState } from "@/lib/checkout/dbx/dbx-checkout-state";

interface DbxStatusBadgeProps {
  status: DbxPaymentStatus;
  className?: string;
}

const toneClasses: Record<string, string> = {
  neutral: "border-white/15 text-white/70 bg-white/5",
  info: "border-sky-400/30 text-sky-200 bg-sky-500/10",
  success: "border-emerald-400/30 text-emerald-200 bg-emerald-500/10",
  warning: "border-amber-400/30 text-amber-100 bg-amber-500/10",
  danger: "border-red-400/30 text-red-200 bg-red-500/10",
};

export function DbxStatusBadge({ status, className = "" }: DbxStatusBadgeProps) {
  const state = dbxPaymentUiState(status);

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${toneClasses[state.tone]} ${className}`}
      role="status"
      aria-live="polite"
      title={state.description}
    >
      {state.label}
    </span>
  );
}