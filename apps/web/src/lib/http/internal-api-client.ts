export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface InternalApiRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, JsonValue> | undefined;
  headers?: Record<string, string> | undefined;
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
  timeoutMs?: number;
}

export class InternalApiError extends Error {
  readonly status: number;
  readonly payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "InternalApiError";
    this.status = status;
    this.payload = payload;
  }
}

function getBaseUrl(): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_NESTJS_BASE_URL ||
    "";

  if (!baseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_BASE_URL or NEXT_PUBLIC_NESTJS_BASE_URL",
    );
  }

  return baseUrl.replace(/\/+$/, "");
}

function withTimeout(timeoutMs: number, signal?: AbortSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeout),
  };
}

export async function internalApiRequest<T>(
  path: string,
  options: InternalApiRequestOptions = {},
): Promise<T> {
  const baseUrl = getBaseUrl();
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? 15_000;
  const { signal, cleanup } = withTimeout(timeoutMs);

  try {
    const response = await fetch(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`, {
      method,
      headers: {
        "content-type": "application/json",
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: options.cache ?? "no-store",
      next: options.next,
      signal,
    });

    const text = await response.text();
    const payload = text ? safeJsonParse(text) : null;

    if (!response.ok) {
      throw new InternalApiError(
        `Internal API request failed: ${method} ${path}`,
        response.status,
        payload,
      );
    }

    return payload as T;
  } finally {
    cleanup();
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
