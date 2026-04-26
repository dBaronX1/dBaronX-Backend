import { getDbxProxyConfig } from "@/server/dbx/dbx-proxy.config";
import { DbxProxyError } from "@/server/dbx/dbx-proxy.errors";
import type {
  DbxProxyForwardOptions,
  DbxProxyForwardResult,
} from "@/server/dbx/dbx-proxy.types";
import { serverLogEvent } from "@/server/observability/server-logger";

export async function forwardDbxProxyRequest<T = unknown>(
  options: DbxProxyForwardOptions,
): Promise<DbxProxyForwardResult<T>> {
  const config = getDbxProxyConfig();

  if (!config.dbxProxyEnabled) {
    throw new DbxProxyError({
      status: 503,
      code: "DBX_PROXY_DISABLED",
      message: "DBX payment proxy is temporarily disabled.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${config.nestApiBaseUrl}${options.path}`, {
      method: options.method,
      headers: options.headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: controller.signal,
    });

    const data = (await response.json().catch(() => null)) as T | null;
    const upstreamMs = Date.now() - startedAt;

    serverLogEvent("dbx_proxy.upstream_completed", {
      route: options.context.route,
      requestId: options.context.requestId,
      status: response.status,
      upstreamMs,
    });

    return {
      ok: response.ok,
      status: response.status,
      data,
      requestId: options.context.requestId,
      upstreamMs,
    };
  } catch (error) {
    const upstreamMs = Date.now() - startedAt;

    serverLogEvent("dbx_proxy.upstream_failed", {
      level: "error",
      route: options.context.route,
      requestId: options.context.requestId,
      upstreamMs,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new DbxProxyError({
      status: 502,
      code: "DBX_PROXY_UPSTREAM_UNAVAILABLE",
      message: "DBX payment service is unavailable.",
      details: {
        upstreamMs,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}