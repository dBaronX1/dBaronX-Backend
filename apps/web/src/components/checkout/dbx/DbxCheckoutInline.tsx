"use client";

import { DbxCheckoutCard } from "@/components/checkout/dbx/DbxCheckoutCard";
import { DbxPaymentErrorAlert } from "@/components/dbx/DbxPaymentErrorAlert";
import { useDbxCheckoutController } from "@/hooks/dbx/useDbxCheckoutController";
import type { DbxCheckoutInput } from "@/types/dbx-checkout";

interface DbxCheckoutInlineProps {
  checkout: DbxCheckoutInput;
  autoCreate?: boolean;
  className?: string;
  onCompleted?: (reference: string) => void;
  onFailed?: (reason: string) => void;
}

export function DbxCheckoutInline({
  checkout,
  autoCreate = false,
  className = "",
  onCompleted,
  onFailed,
}: DbxCheckoutInlineProps) {
  const controller = useDbxCheckoutController({
    checkout,
    autoCreate,
    onCompleted,
    onFailed,
  });

  if (!controller.intent) {
    return (
      <section
        className={`rounded-2xl border border-[rgba(94,23,235,0.25)] bg-[#0D0D2B] p-4 ${className}`}
        aria-label="Start DBX checkout"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C084FC]">
          DBX Checkout
        </p>
        <h3 className="mt-1 text-lg font-bold text-white">Pay with DBX</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/60">
          Create a secure DBX payment intent for this checkout.
        </p>

        <button
          type="button"
          onClick={controller.create}
          disabled={controller.creating}
          className="mt-4 w-full rounded-xl bg-[#5E17EB] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#7C3AED] focus:outline-none focus:ring-2 focus:ring-[#C084FC] disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Create DBX payment intent"
        >
          {controller.creating ? "Creating..." : "Create DBX Payment"}
        </button>

        <DbxPaymentErrorAlert error={controller.error} className="mt-4" />
      </section>
    );
  }

  return (
    <div className={className}>
      <DbxCheckoutCard
        reference={controller.intent.reference}
        status={controller.currentStatus}
        instruction={controller.intent.instructions}
        usdCents={checkout.cart.expectedUsdCents}
        verifying={controller.verifying}
        onVerify={async (signature) => {
          await controller.verify(signature);
        }}
      />

      <DbxPaymentErrorAlert error={controller.error} className="mt-4" />
    </div>
  );
}