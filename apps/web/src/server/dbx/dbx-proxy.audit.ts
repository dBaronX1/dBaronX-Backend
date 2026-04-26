import type { DbxProxyRequestContext } from "@/server/dbx/dbx-proxy.types";
import { serverLogEvent } from "@/server/observability/server-logger";

export function auditDbxProxyStarted(context: DbxProxyRequestContext): void {
  serverLogEvent("dbx_proxy.started", {
    route: context.route,
    requestId: context.requestId,
    method: context.method,
    path: context.path,
    ip: context.ip,
    userAgent: context.userAgent,
    authForwarded: context.authForwarded,
  });
}

export function auditDbxProxyCompleted(
  context: DbxProxyRequestContext,
  status: number,
): void {
  serverLogEvent("dbx_proxy.completed", {
    route: context.route,
    requestId: context.requestId,
    status,
    durationMs: Date.now() - context.startedAt,
  });
}

export function auditDbxProxyFailed(
  context: DbxProxyRequestContext,
  error: unknown,
): void {
  serverLogEvent("dbx_proxy.failed", {
    level: "error",
    route: context.route,
    requestId: context.requestId,
    durationMs: Date.now() - context.startedAt,
    error: error instanceof Error ? error.message : String(error),
  });
}