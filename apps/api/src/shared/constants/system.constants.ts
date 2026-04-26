export const SYSTEM_CONSTANTS = {
  SERVICE_NAME: "dbaronx-api",
  PLATFORM_NAME: "dBaronX",
  DEFAULT_CURRENCY: "USD",
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  REQUEST_TIMEOUT_MS: 15_000,
  HTTP_TIMEOUT_MS: 20_000,
  CACHE_TTL_SECONDS: 60,
  IDEMPOTENCY_TTL_SECONDS: 300,
  HEALTH_TABLE: "health_check",
  DATE_FORMAT_UTC: "YYYY-MM-DD",
} as const;

export const ORDER_STATUSES = [
  "created",
  "pending",
  "processing",
  "shipped",
  "completed",
  "cancelled",
] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "failed",
] as const;

export const PAYMENT_PROVIDERS = [
  "stripe",
  "paystack",
  "flutterwave",
  "paypal",
  "binance_pay",
  "coinbase",
  "manual",
] as const;

export const SUPPLIER_STATUSES = [
  "active",
  "inactive",
  "paused",
] as const;

export const USER_ROLES = [
  "user",
  "admin",
  "internal",
] as const;

export const WATCH_REWARD_STATUSES = [
  "pending",
  "credited",
  "rejected",
  "reversed",
] as const;
