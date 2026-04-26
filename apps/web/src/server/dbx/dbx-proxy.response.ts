import { NextResponse } from "next/server";
import { normalizeDbxProxyError } from "@/server/dbx/dbx-proxy.errors";
import type {
  DbxProxyForwardResult,
  DbxProxyRequestContext,
} from "@/server/dbx/dbx-proxy.types";
import {
  auditDbxProxyCompleted,
  auditDbxProxyFailed,
} from "@/server/dbx/dbx-proxy.audit";

export function dbxProxyJson<T>(
  context: DbxProxyRequestContext,
  result: DbxProxyForwardResult<T>,
): NextResponse {
  auditDbxProxyCompleted(context, result.status);

  return NextResponse.json(result.data, {
    status: result.status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": context.requestId,
      "x-dbx-upstream-ms": String(result.upstreamMs),
    },
  });
}

export function dbxProxyErrorJson(
  context: DbxProxyRequestContext,
  error: unknown,
): NextResponse {
  auditDbxProxyFailed(context, error);
  const normalized = normalizeDbxProxyError(error);

  return NextResponse.json(normalized.toPayload(context.requestId), {
    status: normalized.status,
    headers: {
      "cache-control": "no-store",
      "x-request-id": context.requestId,
    },
  });
}