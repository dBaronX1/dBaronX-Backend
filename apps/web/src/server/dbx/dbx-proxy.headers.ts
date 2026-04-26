import { NextRequest } from "next/server";
import type { DbxProxyRequestContext } from "@/server/dbx/dbx-proxy.types";

export function buildDbxProxyHeaders(
  request: NextRequest,
  context: DbxProxyRequestContext,
): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
    "x-request-id": context.requestId,
    "x-forwarded-host": request.headers.get("host") || "",
    "x-forwarded-proto": request.headers.get("x-forwarded-proto") || "https",
    "x-dbx-proxy-route": context.route,
  };

  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const idempotencyKey = request.headers.get("idempotency-key");

  if (authorization) headers.authorization = authorization;
  if (cookie) headers.cookie = cookie;
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  return headers;
}