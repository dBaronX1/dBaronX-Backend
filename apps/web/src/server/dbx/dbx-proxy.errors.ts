import type { DbxProxyErrorPayload } from "@/server/dbx/dbx-proxy.types";

export class DbxProxyError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(input: {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  }) {
    super(input.message);
    this.name = "DbxProxyError";
    this.status = input.status;
    this.code = input.code;
    this.details = input.details;
  }

  toPayload(requestId: string): DbxProxyErrorPayload {
    return {
      success: false,
      message: this.message,
      code: this.code,
      requestId,
      details: this.details,
    };
  }
}

export function normalizeDbxProxyError(error: unknown): DbxProxyError {
  if (error instanceof DbxProxyError) return error;

  if (error instanceof Error) {
    return new DbxProxyError({
      status: 500,
      code: "DBX_PROXY_ERROR",
      message: error.message || "DBX proxy request failed.",
    });
  }

  return new DbxProxyError({
    status: 500,
    code: "DBX_PROXY_UNKNOWN_ERROR",
    message: "DBX proxy request failed.",
    details: error,
  });
}