import type { DbxPaymentStatus } from "@/types/dbx/dbx-payment.types";
import { dbxPaymentUiState } from "@/lib/checkout/dbx/dbx-checkout-state";

export function dbxStatusAriaLabel(status: DbxPaymentStatus): string {
  const state = dbxPaymentUiState(status);
  return `DBX payment status: ${state.label}. ${state.description}`;
}

export function dbxCopyAriaLabel(label: string, copied: boolean): string {
  return copied ? `${label} copied` : `${label}. Copy to clipboard`;
}

export function dbxSignatureInputDescription(status: DbxPaymentStatus): string {
  const state = dbxPaymentUiState(status);

  if (!state.canSubmitSignature) {
    return "Transaction signature entry is currently disabled for this DBX payment status.";
  }

  return "Paste the full Solana transaction signature after sending DBX to the treasury wallet.";
}

export function dbxPaymentLiveMessage(status: DbxPaymentStatus): string {
  const state = dbxPaymentUiState(status);
  return `${state.label}. ${state.description}`;
}