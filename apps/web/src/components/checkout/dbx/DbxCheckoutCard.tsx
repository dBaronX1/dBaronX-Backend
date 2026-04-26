"use client";

import type {
  DbxPaymentInstruction,
  DbxPaymentStatus,
} from "@/types/dbx/dbx-payment.types";
import { DbxCheckoutSummary } from "@/components/checkout/dbx/DbxCheckoutSummary";
import { DbxInstructionAccordion } from "@/components/dbx/DbxInstructionAccordion";
import { DbxMobilePaymentSteps } from "@/components/dbx/DbxMobilePaymentSteps";
import { DbxPaymentTimeline } from "@/components/dbx/DbxPaymentTimeline";
import { DbxPaymentSuccessAlert } from "@/components/dbx/DbxPaymentSuccessAlert";
import { DbxPaymentSyncPendingAlert } from "@/components/dbx/DbxPaymentSyncPendingAlert";
import { DbxTransactionSignatureForm } from "@/components/dbx/DbxTransactionSignatureForm";

interface DbxCheckoutCardProps {
  reference: string;
  status: DbxPaymentStatus;
  instruction: DbxPaymentInstruction;
  usdCents?: number;
  verifying?: boolean;
  disabled?: boolean;
  onVerify: (signature: string) => Promise<void> | void;
  className?: string;
}

export function DbxCheckoutCard({
  reference,
  status,
  instruction,
  usdCents,
  verifying = false,
  disabled = false,
  onVerify,
  className = "",
}: DbxCheckoutCardProps) {
  return (
    <section
      className={`rounded-2xl border border-[rgba(94,23,235,0.25)] bg-[#0D0D2B] p-4 shadow-[0_0_30px_rgba(94,23,235,0.10)] ${className}`}
      aria-label="DBX checkout card"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C084FC]">
            DBX Checkout
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">
            Pay with dBaronX DBX
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            Complete checkout using DBX on Solana. Verification is automatic after you submit the transaction signature.
          </p>
        </div>
      </div>

      <DbxPaymentTimeline status={status} className="mt-4" />

      <DbxCheckoutSummary
        status={status}
        instruction={instruction}
        usdCents={usdCents}
        className="mt-4"
      />

      <DbxInstructionAccordion instruction={instruction} className="mt-4" />

      <DbxTransactionSignatureForm
        status={status}
        loading={verifying}
        disabled={disabled}
        onSubmit={onVerify}
        className="mt-4"
      />

      {status === "completed" ? (
        <DbxPaymentSuccessAlert reference={reference} className="mt-4" />
      ) : null}

      {status === "verified_pending_order_sync" ? (
        <DbxPaymentSyncPendingAlert reference={reference} className="mt-4" />
      ) : null}

      <DbxMobilePaymentSteps className="mt-4" />
    </section>
  );
}