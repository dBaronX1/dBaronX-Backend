export type DbxProxyRoute =
  | "create_intent"
  | "verify_payment"
  | "payment_status"
  | "retry_order_sync";

export interface DbxProxyRequestContext {
  route: DbxProxyRoute;
  requestId: string;
  method: string;
  path: string;
  ip: string;
  userAgent: string;
  authForwarded: boolean;
  startedAt: number;
}

export interface DbxProxyForwardOptions {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  context: DbxProxyRequestContext;
  headers?: HeadersInit;
}

export interface DbxProxyForwardResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  requestId: string;
  upstreamMs: number;
}

export interface DbxProxyErrorPayload {
  success: false;
  message: string;
  code: string;
  requestId: string;
  details?: unknown;
}