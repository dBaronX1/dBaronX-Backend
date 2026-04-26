export type DbxPaymentStatus =
  | "pending"
  | "submitted"
  | "verified"
  | "verified_pending_order_sync"
  | "completed"
  | "expired"
  | "failed";

export interface CreateDbxPaymentIntentPayload {
  cartId: string;
  medusaOrderId?: string;
  userId?: string;
  email: string;
  customerName: string;
  expectedUsdCents: number;
  expectedDbxBaseUnits: number;
  senderWallet?: string;
  idempotencyKey?: string;
  metadata?: Record<string, unknown>;
}

export interface DbxPaymentIntent {
  id: string;
  reference: string;
  status: DbxPaymentStatus;
  cartId: string;
  medusaOrderId: string | null;
  expectedUsdCents: number;
  expectedDbxBaseUnits: string;
  dbxMint: string;
  treasuryWallet: string;
  senderWallet: string | null;
  transactionSignature?: string | null;
  expiresAt: string;
  verifiedAt?: string | null;
  completedAt?: string | null;
  failureReason?: string | null;
  createdAt?: string;
}

export interface DbxPaymentInstructions {
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

export interface DbxPaymentIntentResponse extends DbxPaymentIntent {
  provider: "crypto";
  instructions: DbxPaymentInstructions;
}

export interface VerifyDbxPaymentPayload {
  intentReference: string;
  transactionSignature: string;
  senderWallet?: string;
}

export interface VerifyDbxPaymentResponse {
  reference: string;
  status: DbxPaymentStatus;
  transactionSignature: string | null;
  verifiedAt: string | null;
  completedAt: string | null;
  failureReason: string | null;
}

export interface DbxStatusResponse extends DbxPaymentIntent {}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: unknown;
  requestId?: string;
  timestamp?: string;
}

export function formatDbxBaseUnits(baseUnits: string | number, decimals = 9): string {
  const raw = String(baseUnits || "0").replace(/[^\d]/g, "") || "0";
  const padded = raw.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals);
  const fraction = padded.slice(-decimals).replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

export function normalizeDbxIntent(input: DbxPaymentIntent): DbxPaymentIntentResponse {
  return {
    ...input,
    provider: "crypto",
    instructions: {
      network: "solana",
      tokenSymbol: "DBX",
      tokenMint: input.dbxMint,
      decimals: 9,
      treasuryWallet: input.treasuryWallet,
      amountBaseUnits: input.expectedDbxBaseUnits,
      amountDisplay: formatDbxBaseUnits(input.expectedDbxBaseUnits, 9),
      reference: input.reference,
      expiresAt: input.expiresAt,
    },
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error?.message ||
      data?.error ||
      `Request failed with HTTP ${response.status}`;

    throw new Error(typeof message === "string" ? message : "Request failed");
  }

  return data as T;
}

export async function postJson<TResponse>(
  url: string,
  payload: Record<string, unknown>,
): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  return readJson<TResponse>(response);
}

export async function getJson<TResponse>(url: string): Promise<TResponse> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      accept: "application/json",
    },
  });

  return readJson<TResponse>(response);
}

export async function createDbxPaymentIntent(
  payload: CreateDbxPaymentIntentPayload,
): Promise<DbxPaymentIntentResponse> {
  const envelope = await postJson<ApiEnvelope<DbxPaymentIntent>>(
    "/api/checkout/dbx/intent",
    payload as unknown as Record<string, unknown>,
  );

  return normalizeDbxIntent(envelope.data);
}

export async function verifyDbxPayment(
  payload: VerifyDbxPaymentPayload,
): Promise<VerifyDbxPaymentResponse> {
  const envelope = await postJson<ApiEnvelope<VerifyDbxPaymentResponse>>(
    "/api/checkout/dbx/verify",
    payload as unknown as Record<string, unknown>,
  );

  return envelope.data;
}

export async function getDbxPaymentStatus(
  reference: string,
): Promise<DbxStatusResponse> {
  const envelope = await getJson<ApiEnvelope<DbxStatusResponse>>(
    `/api/checkout/dbx/status/${encodeURIComponent(reference)}`,
  );

  return envelope.data;
}
