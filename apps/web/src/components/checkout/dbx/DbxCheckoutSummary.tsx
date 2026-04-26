import type { DbxPaymentInstruction, DbxPaymentStatus } from "@/types/dbx/dbx-payment.types";
import { DbxAmountCard } from "@/components/dbx/DbxAmountCard";
import { DbxStatusBadge } from "@/components/dbx/DbxStatusBadge";
import { useDbxCountdown } from "@/hooks/dbx/useDbxCountdown";

interface DbxCheckoutSummaryProps {
  status: DbxPaymentStatus;
  instruction: DbxPaymentInstruction;
  usdCents?: number;
  className?: string;
}

export function DbxCheckoutSummary({
  status,
  instruction,
  usdCents,
  className = "",
}: DbxCheckoutSummaryProps) {
  const countdown = useDbxCountdown(instruction.expiresAt);

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      <DbxAmountCard
        baseUnits={instruction.amountBaseUnits}
        usdCents={usdCents}
      />

      <div
        className="rounded-xl border border-[rgba(94,23,235,0.20)] bg-[#09091F] p-3"
        aria-label="DBX payment status and expiry"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-white/60">Status</p>
            <div className="mt-2">
              <DbxStatusBadge status={status} />
            </div>
          </div>

          <div className="text-right">
            <p className="text-xs font-semibold text-white/60">Expires in</p>
            <p className="mt-2 font-mono text-sm font-bold text-white" aria-live="polite">
              {countdown.label || "—"}
            </p>
          </div>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-white/45">
          Send DBX before expiry. Expired intents cannot be verified and must be recreated.
        </p>
      </div>
    </div>
  );
}