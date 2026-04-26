import { NextRequest } from "next/server";
import { DbxProxyError } from "@/server/dbx/dbx-proxy.errors";

export async function assertServerRequestBodyLimit(
  request: NextRequest,
  maxBytes: number,
): Promise<void> {
  const contentLength = Number(request.headers.get("content-length") || "0");

  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new DbxProxyError({
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: `Request body exceeds ${maxBytes} bytes.`,
      details: {
        contentLength,
        maxBytes,
      },
    });
  }
}

export function extractServerClientIp(request: NextRequest): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function assertAllowedMethod(
  request: NextRequest,
  allowed: string[],
): void {
  if (!allowed.includes(request.method.toUpperCase())) {
    throw new DbxProxyError({
      status: 405,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
      details: {
        allowed,
      },
    });
  }
}