import { getDbxProxyConfig } from "@/server/dbx/dbx-proxy.config";
import { DbxProxyError } from "@/server/dbx/dbx-proxy.errors";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function assertDbxProxyRateLimit(key: string): void {
  const config = getDbxProxyConfig();
  const now = Date.now();
  const safeKey = key || "unknown";
  const existing = buckets.get(safeKey);

  let bucket: Bucket;

  if (!existing || now >= existing.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + config.rateLimitWindowMs,
    };
    buckets.set(safeKey, bucket);
  } else {
    bucket = existing;
  }

  bucket.count += 1;

  if (bucket.count > config.rateLimitMax) {
    throw new DbxProxyError({
      status: 429,
      code: "DBX_PROXY_RATE_LIMITED",
      message: "Too many DBX payment requests. Try again shortly.",
      details: {
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      },
    });
  }

  if (buckets.size > 5000) {
    cleanupDbxProxyRateLimit();
  }
}

export function cleanupDbxProxyRateLimit(): number {
  const now = Date.now();
  let removed = 0;

  for (const [key, bucket] of buckets.entries()) {
    if (now >= bucket.resetAt) {
      buckets.delete(key);
      removed += 1;
    }
  }

  return removed;
}