"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDbxPayment } from "@/hooks/useDbxPayment";
import { buildDbxPaymentIntentPayload } from "@/lib/checkout/dbx-checkout-normalizer";
import { dbxPaymentUiState } from "@/lib/checkout/dbx/dbx-checkout-state";
import { userFacingDbxError } from "@/lib/checkout/dbx/dbx-checkout-errors";
import {
  clearStoredDbxCheckout,
  loadStoredDbxCheckout,
  storeDbxCheckout,
} from "@/lib/checkout/dbx/dbx-checkout-storage";
import {
  emitDbxCheckoutEvent,
} from "@/lib/checkout/dbx/dbx-checkout-events";
import type { DbxCheckoutInput } from "@/types/dbx-checkout";
import type { DbxPaymentStatus } from "@/types/dbx/dbx-payment.types";

interface UseDbxCheckoutControllerInput {
  checkout: DbxCheckoutInput;
  autoCreate?: boolean;
  onCompleted?: (reference: string) => void;
  onFailed?: (reason: string) => void;
}

export function useDbxCheckoutController({
  checkout,
  autoCreate = false,
  onCompleted,
  onFailed,
}: UseDbxCheckoutControllerInput) {
  const payment = useDbxPayment();
  const [booted, setBooted] = useState(false);

  const payload = useMemo(
    () => buildDbxPaymentIntentPayload(checkout),
    [checkout],
  );

  const stored = useMemo(
    () => loadStoredDbxCheckout(checkout.cart.cartId),
    [checkout.cart.cartId],
  );

  const intent = payment.intent || stored?.intent || null;
  const status = payment.status || payment.verification || intent;
  const currentStatus = (status?.status || intent?.status || "pending") as DbxPaymentStatus;
  const uiState = useMemo(() => dbxPaymentUiState(currentStatus), [currentStatus]);

  const create = useCallback(async () => {
    const result = await payment.createIntent(payload);
    storeDbxCheckout(checkout.cart.cartId, result);
    emitDbxCheckoutEvent("dbx_checkout_intent_created", {
      reference: result.reference,
      cartId: checkout.cart.cartId,
      status: result.status,
    });
    return result;
  }, [checkout.cart.cartId, payload, payment]);

  const verify = useCallback(
    async (signature: string) => {
      if (!intent?.reference) {
        throw new Error("Create a DBX payment intent before verification.");
      }

      const result = await payment.verify({
        intentReference: intent.reference,
        transactionSignature: signature,
        senderWallet: checkout.customer.senderWallet,
      });

      emitDbxCheckoutEvent("dbx_checkout_verified", {
        reference: result.reference,
        cartId: checkout.cart.cartId,
        status: result.status,
      });

      if (result.status === "completed") {
        clearStoredDbxCheckout(checkout.cart.cartId);
        onCompleted?.(result.reference);
      }

      if (result.status === "failed" || result.status === "expired") {
        const reason = result.failureReason || "DBX payment failed.";
        onFailed?.(reason);
      }

      return result;
    },
    [checkout.cart.cartId, checkout.customer.senderWallet, intent?.reference, onCompleted, onFailed, payment],
  );

  const refresh = useCallback(async () => {
    if (!intent?.reference) return null;

    const result = await payment.refreshStatus(intent.reference);

    if (result?.status === "completed") {
      clearStoredDbxCheckout(checkout.cart.cartId);
      onCompleted?.(result.reference);
    }

    if (result?.status === "failed" || result?.status === "expired") {
      onFailed?.(result.failureReason || "DBX payment failed.");
    }

    return result;
  }, [checkout.cart.cartId, intent?.reference, onCompleted, onFailed, payment]);

  useEffect(() => {
    if (booted) return;
    setBooted(true);

    if (stored?.intent && stored.intent.status !== "completed") {
      emitDbxCheckoutEvent("dbx_checkout_restored", {
        reference: stored.intent.reference,
        cartId: checkout.cart.cartId,
        status: stored.intent.status,
      });
      return;
    }

    if (autoCreate && !payment.intent) {
      void create().catch((error) => {
        onFailed?.(userFacingDbxError(error));
      });
    }
  }, [autoCreate, booted, checkout.cart.cartId, create, onFailed, payment.intent, stored]);

  return {
    intent,
    status,
    currentStatus,
    uiState,
    creating: payment.loading,
    verifying: payment.verifying,
    error: payment.error,
    create,
    verify,
    refresh,
    reset: payment.reset,
  };
}