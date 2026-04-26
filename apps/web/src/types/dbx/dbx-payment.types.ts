export type DbxPaymentStatus =
  | "pending"
  | "submitted"
  | "verified"
  | "verified_pending_order_sync"
  | "completed"
  | "expired"
  | "failed";

export type DbxCheckoutStep =
  | "idle"
  | "creating"
  | "awaiting_payment"
  | "verifying"
  | "verified"
  | "sync_pending"
  | "completed"
  | "expired"
  | "failed";

export interface DbxTokenIdentity {
  name: "dBaronX";
  symbol: "DBX";
  network: "solana";
  mintAddress: string;
  decimals: 9;
}

export interface DbxPaymentInstruction {
  network: "solana";
  tokenSymbol: "DBX";
  tokenMint: string;
  decimals: 9;
  treasuryWallet: string;
  amountBaseUnits: string;
  amountDisplay: string;
  reference: string;
  expiresAt: string;
}

export interface DbxPaymentUiState {
  status: DbxPaymentStatus;
  step: DbxCheckoutStep;
  label: string;
  description: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  canSubmitSignature: boolean;
  canRefresh: boolean;
  terminal: boolean;
}

export interface DbxCopyState {
  copied: boolean;
  label: string;
  value: string;
}

export interface DbxPaymentClientError {
  code: string;
  message: string;
  recoverable: boolean;
  details?: unknown;
}