"use client";

import { useMemo } from "react";
import { DbxPaymentPanel } from "@/components/checkout/DbxPaymentPanel";
import { buildDbxPaymentIntentPayload } from "@/lib/checkout/dbx-checkout-normalizer";
import type { DbxCheckoutInput } from "@/types/dbx-checkout";

interface DbxCheckoutBridgeProps {
  checkout: DbxCheckoutInput;
  enabled?: boolean;
  className?: string;
  onCompleted?: (reference: string) => void;
  onFailed?: (reason: string) => void;
}

export function DbxCheckoutBridge({
  checkout,
  enabled = true,
  className = "",
  onCompleted,
  onFailed,
}: DbxCheckoutBridgeProps) {
  const payload = useMemo(
    () => buildDbxPaymentIntentPayload(checkout),
    [checkout],
  );

  if (!enabled) {
    return null;
  }

  return (
    <div className={className} data-dbx-checkout-bridge="true">
      <DbxPaymentPanel
        payload={payload}
        onCompleted={onCompleted}
        onFailed={onFailed}
      />
    </div>
  );
}
