"use client";

import { useCallback, useMemo, useState } from "react";
import {
  createDbxPaymentIntent,
  getDbxPaymentStatus,
  verifyDbxPayment,
  type CreateDbxPaymentIntentPayload,
  type DbxPaymentIntentResponse,
  type DbxStatusResponse,
  type VerifyDbxPaymentPayload,
  type VerifyDbxPaymentResponse,
} from "@/lib/api/nest/dbx-payments";

type DbxPaymentStep =
  | "idle"
  | "creating"
  | "awaiting_payment"
  | "verifying"
  | "completed"
  | "failed";

export function useDbxPayment() {
  const [intent, setIntent] = useState<DbxPaymentIntentResponse | null>(null);
  const [verification, setVerification] = useState<VerifyDbxPaymentResponse | null>(null);
  const [status, setStatus] = useState<DbxStatusResponse | null>(null);
  const [step, setStep] = useState<DbxPaymentStep>("idle");
  const [error, setError] = useState<string | null>(null);

  const loading = step === "creating";
  const verifying = step === "verifying";

  const createIntent = useCallback(
    async (input: CreateDbxPaymentIntentPayload) => {
      setStep("creating");
      setError(null);

      try {
        const result = await createDbxPaymentIntent(input);
        setIntent(result);
        setStatus(result);
        setStep("awaiting_payment");
        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create DBX payment intent.";
        setError(message);
        setStep("failed");
        throw err;
      }
    },
    [],
  );

  const verify = useCallback(async (input: VerifyDbxPaymentPayload) => {
    setStep("verifying");
    setError(null);

    try {
      const result = await verifyDbxPayment(input);
      setVerification(result);
      setStep(result.status === "completed" ? "completed" : "awaiting_payment");

      if (result.status === "failed" || result.status === "expired") {
        setStep("failed");
      }

      return result;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to verify DBX payment.";
      setError(message);
      setStep("failed");
      throw err;
    }
  }, []);

  const refreshStatus = useCallback(
    async (reference?: string) => {
      const target = reference || intent?.reference;

      if (!target) {
        return null;
      }

      setError(null);

      try {
        const result = await getDbxPaymentStatus(target);
        setStatus(result);

        if (result.status === "completed") {
          setStep("completed");
        } else if (result.status === "failed" || result.status === "expired") {
          setStep("failed");
        }

        return result;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to refresh DBX payment status.";
        setError(message);
        throw err;
      }
    },
    [intent?.reference],
  );

  const reset = useCallback(() => {
    setIntent(null);
    setVerification(null);
    setStatus(null);
    setStep("idle");
    setError(null);
  }, []);

  return useMemo(
    () => ({
      intent,
      verification,
      status,
      step,
      loading,
      verifying,
      error,
      createIntent,
      verify,
      refreshStatus,
      reset,
    }),
    [
      createIntent,
      error,
      intent,
      loading,
      refreshStatus,
      reset,
      status,
      step,
      verification,
      verify,
      verifying,
    ],
  );
}
