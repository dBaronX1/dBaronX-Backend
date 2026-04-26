export const DBX_PAYMENT_STATUSES = [
  "pending",
  "submitted",
  "verified",
  "verified_pending_order_sync",
  "completed",
  "expired",
  "failed",
] as const;

export type DbxPaymentStatus = (typeof DBX_PAYMENT_STATUSES)[number];

export type DbxPaymentEventType =
  | "intent_created"
  | "intent_submitted"
  | "verification_requested"
  | "verification_succeeded"
  | "verification_failed"
  | "order_sync_succeeded"
  | "order_sync_failed"
  | "intent_completed"
  | "intent_expired"
  | "intent_failed";

export interface DbxPaymentIntentRecord {
  id: string;
  reference: string;
  user_id: string | null;
  email: string;
  customer_name: string;
  cart_id: string;
  medusa_order_id: string | null;
  expected_usd_cents: number;
  expected_dbx_base_units: string;
  dbx_mint: string;
  treasury_wallet: string;
  sender_wallet: string | null;
  transaction_signature: string | null;
  status: DbxPaymentStatus;
  expires_at: string;
  verified_at: string | null;
  completed_at: string | null;
  failure_reason: string | null;
  idempotency_key: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbxPaymentVerificationRecord {
  id: string;
  intent_id: string;
  reference: string;
  transaction_signature: string;
  status: "passed" | "failed";
  reason: string | null;
  raw_response: Record<string, unknown>;
  created_at: string;
}

export interface DbxChainVerificationRequest {
  intentReference: string;
  transactionSignature: string;
  expectedMint: string;
  expectedTreasuryWallet: string;
  expectedAmountBaseUnits: string;
  expectedSenderWallet?: string | null;
  expiresAt: string;
}

export interface DbxChainVerificationResponse {
  success: boolean;
  verified: boolean;
  status: "passed" | "failed";
  reason?: string | null;
  signature: string;
  mint?: string | null;
  receiver?: string | null;
  sender?: string | null;
  amountBaseUnits?: string | null;
  confirmations?: number | null;
  slot?: number | null;
  raw?: Record<string, unknown>;
}
