import type {
  DbxCheckoutStep,
  DbxPaymentStatus,
  DbxPaymentUiState,
} from "@/types/dbx/dbx-payment.types";

export function stepFromStatus(status: DbxPaymentStatus): DbxCheckoutStep {
  switch (status) {
    case "completed":
      return "completed";
    case "verified":
      return "verified";
    case "verified_pending_order_sync":
      return "sync_pending";
    case "expired":
      return "expired";
    case "failed":
      return "failed";
    case "submitted":
      return "verifying";
    case "pending":
    default:
      return "awaiting_payment";
  }
}

export function dbxPaymentUiState(status: DbxPaymentStatus): DbxPaymentUiState {
  const step = stepFromStatus(status);

  switch (status) {
    case "completed":
      return {
        status,
        step,
        label: "Completed",
        description: "DBX payment is verified and the order sync is complete.",
        tone: "success",
        canSubmitSignature: false,
        canRefresh: true,
        terminal: true,
      };

    case "verified":
      return {
        status,
        step,
        label: "Verified",
        description: "DBX payment is verified. Order completion is in progress.",
        tone: "success",
        canSubmitSignature: false,
        canRefresh: true,
        terminal: false,
      };

    case "verified_pending_order_sync":
      return {
        status,
        step,
        label: "Order sync pending",
        description: "Payment is verified. Order sync will retry safely.",
        tone: "warning",
        canSubmitSignature: false,
        canRefresh: true,
        terminal: false,
      };

    case "expired":
      return {
        status,
        step,
        label: "Expired",
        description: "This DBX payment intent has expired. Create a new one.",
        tone: "danger",
        canSubmitSignature: false,
        canRefresh: true,
        terminal: true,
      };

    case "failed":
      return {
        status,
        step,
        label: "Failed",
        description: "DBX payment verification failed. Check the transaction signature.",
        tone: "danger",
        canSubmitSignature: true,
        canRefresh: true,
        terminal: true,
      };

    case "submitted":
      return {
        status,
        step,
        label: "Submitted",
        description: "Transaction signature submitted. Verification is running.",
        tone: "info",
        canSubmitSignature: false,
        canRefresh: true,
        terminal: false,
      };

    case "pending":
    default:
      return {
        status,
        step,
        label: "Awaiting payment",
        description: "Send DBX on Solana, then paste the transaction signature.",
        tone: "neutral",
        canSubmitSignature: true,
        canRefresh: true,
        terminal: false,
      };
  }
}