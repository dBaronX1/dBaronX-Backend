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
  baseUrls?: string[] | undefined;
  allowBaseUrlFallback?: boolean | undefined;
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

function getBaseUrlCandidates(explicitBaseUrls?: string[]): string[] {
  const envCandidates = [
    process.env.NEXT_PUBLIC_API_BASE_URL,
    process.env.NEXT_PUBLIC_NESTJS_BASE_URL,
    process.env.NEXT_PUBLIC_API_URL,
    process.env.NEXT_PUBLIC_NEST_API_URL,
    typeof window === "undefined" ? process.env.NEST_API_URL : "",
  ];

  const resolved = [...(explicitBaseUrls ?? []), ...envCandidates]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .map((value) => value.replace(/\/+$/, ""));

  const unique = [...new Set(resolved)];

  if (unique.length === 0) {
    throw new Error(
      "Missing API base URL. Expected at least one of: NEXT_PUBLIC_API_BASE_URL, NEXT_PUBLIC_NESTJS_BASE_URL, NEXT_PUBLIC_API_URL, NEXT_PUBLIC_NEST_API_URL, NEST_API_URL",
    );
  }

  return unique;
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
  const method = options.method ?? "GET";
  const timeoutMs = options.timeoutMs ?? 15_000;
  const baseUrls = getBaseUrlCandidates(options.baseUrls);
  const allowBaseUrlFallback = options.allowBaseUrlFallback ?? true;
  const candidates = allowBaseUrlFallback ? baseUrls : baseUrls.slice(0, 1);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let lastError: unknown;

  for (const [index, baseUrl] of candidates.entries()) {
    const { signal, cleanup } = withTimeout(timeoutMs);

    try {
      const response = await fetch(`${baseUrl}${normalizedPath}`, {
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
        const error = new InternalApiError(
          `Internal API request failed: ${method} ${path}`,
          response.status,
          payload,
        );

        lastError = error;
        const canRetryWithFallback = response.status >= 500 && index < candidates.length - 1;
        if (canRetryWithFallback) {
          continue;
        }

        throw error;
      }

      return payload as T;
    } catch (error) {
      lastError = error;
      const canRetryWithFallback = index < candidates.length - 1;
      if (!canRetryWithFallback) {
        throw error;
      }
    } finally {
      cleanup();
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Internal API request failed: ${method} ${path}`);
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}
