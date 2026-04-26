export const DBX_PAYMENT_CONSTANTS = {
  PROVIDER: "dbx_solana",
  TOKEN_NAME: "dBaronX",
  TOKEN_SYMBOL: "DBX",
  NETWORK: "solana",
  MINT_ADDRESS: "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE",
  DECIMALS: 9,
  DEFAULT_INTENT_TTL_MINUTES: 30,
  MAX_INTENT_TTL_MINUTES: 1440,
  MIN_CONFIRMATION_STATUS: "confirmed",
  FINAL_CONFIRMATION_STATUS: "finalized",
  REFERENCE_PREFIX: "DBX",
  IDEMPOTENCY_PREFIX: "dbx-payment",
  ORDER_SYNC_RETRY_LIMIT: 5,
  ORDER_SYNC_LOCK_TTL_MS: 30_000,
  CONFIRM_LOCK_TTL_MS: 30_000,
  FASTAPI_VERIFY_PATH: "/internal/dbx/verify-payment",
} as const;

export const DBX_PAYMENT_TERMINAL_STATUSES = [
  "completed",
  "expired",
  "failed",
] as const;

export const DBX_PAYMENT_ACTIVE_STATUSES = [
  "pending",
  "submitted",
  "verified",
  "verified_pending_order_sync",
] as const;

export const DBX_PAYMENT_AUDIT_EVENTS = {
  INTENT_CREATED: "dbx.intent.created",
  INTENT_SUBMITTED: "dbx.intent.submitted",
  VERIFY_REQUESTED: "dbx.verify.requested",
  VERIFY_SUCCEEDED: "dbx.verify.succeeded",
  VERIFY_FAILED: "dbx.verify.failed",
  ORDER_SYNC_SUCCEEDED: "dbx.order_sync.succeeded",
  ORDER_SYNC_FAILED: "dbx.order_sync.failed",
  INTENT_COMPLETED: "dbx.intent.completed",
  INTENT_EXPIRED: "dbx.intent.expired",
  INTENT_FAILED: "dbx.intent.failed",
  IDEMPOTENCY_HIT: "dbx.idempotency.hit",
  RISK_BLOCKED: "dbx.risk.blocked",
} as const;