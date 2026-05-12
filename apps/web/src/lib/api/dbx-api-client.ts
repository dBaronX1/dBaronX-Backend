import { getPublicEnv } from "@/lib/env";

export type DbxApiRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

export class DbxApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly payload: unknown,
  ) {
    super(message);
    this.name = "DbxApiClientError";
  }
}

export async function dbxApiRequest<T>(path: string, options: DbxApiRequestOptions = {}): Promise<T> {
  const baseUrl = getPublicEnv().apiBaseUrl;
  if (!baseUrl) {
    throw new Error("dBaronX API is not configured. Set NEXT_PUBLIC_API_BASE_URL to the deployed NestJS API URL.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const response = await fetch(`${baseUrl}${normalizedPath}`, {
    method: options.method || "GET",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {}),
    },
    body: typeof options.body === "undefined" ? undefined : JSON.stringify(options.body),
    signal: options.signal,
    cache: "no-store",
  });
  const text = await response.text();
  const payload = safeJson(text);
  if (!response.ok) {
    throw new DbxApiClientError(`dBaronX API request failed (${response.status})`, response.status, payload);
  }
  return payload as T;
}

function safeJson(text: string) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
