import { getNestApiConfig } from "@/server/api/nest-api.config";

export interface NestApiRequestOptions {
  path: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: HeadersInit;
  body?: unknown;
  requestId?: string;
}

export async function nestApiRequest<T = unknown>(
  options: NestApiRequestOptions,
): Promise<{
  status: number;
  ok: boolean;
  data: T | null;
  durationMs: number;
}> {
  const config = getNestApiConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  const startedAt = Date.now();

  try {
    const response = await fetch(`${config.baseUrl}${options.path}`, {
      method: options.method || "GET",
      headers: {
        accept: "application/json",
        ...(options.body === undefined ? {} : { "content-type": "application/json" }),
        "x-service-name": config.serviceName,
        ...(options.requestId ? { "x-request-id": options.requestId } : {}),
        ...(options.headers || {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: controller.signal,
    });

    return {
      status: response.status,
      ok: response.ok,
      data: (await response.json().catch(() => null)) as T | null,
      durationMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}