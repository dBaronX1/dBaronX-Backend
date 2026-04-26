import type { DbxPaymentClientError } from "@/types/dbx/dbx-payment.types";

export function normalizeDbxClientError(error: unknown): DbxPaymentClientError {
  if (error instanceof Error) {
    return {
      code: "DBX_CLIENT_ERROR",
      message: error.message || "DBX payment failed.",
      recoverable: true,
    };
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const message =
      String(record.message || "") ||
      String((record.error as Record<string, unknown> | undefined)?.["message"] || "") ||
      "DBX payment failed.";

    return {
      code: String(record.code || "DBX_CLIENT_ERROR"),
      message,
      recoverable: record.recoverable === false ? false : true,
      details: record,
    };
  }

  return {
    code: "DBX_UNKNOWN_ERROR",
    message: "DBX payment failed.",
    recoverable: true,
  };
}

export function userFacingDbxError(error: unknown): string {
  const normalized = normalizeDbxClientError(error);
  return normalized.message;
}

export function dbxErrorRecoveryHint(error: unknown): string {
  const normalized = normalizeDbxClientError(error);

  if (!normalized.recoverable) {
    return "This issue requires support review.";
  }

  if (normalized.message.toLowerCase().includes("signature")) {
    return "Confirm the transaction on Solana and paste the full signature.";
  }

  if (normalized.message.toLowerCase().includes("expired")) {
    return "Create a new DBX payment intent and send a fresh transaction.";
  }

  return "Check the payment details and try again.";
}