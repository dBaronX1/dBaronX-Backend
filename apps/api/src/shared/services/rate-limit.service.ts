import { Injectable } from "@nestjs/common";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  key: string;
  count: number;
  remaining: number;
  limit: number;
  resetAt: number;
  retryAfterSec: number;
};

@Injectable()
export class RateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();

  check(key: string, limit: number, windowMs: number): boolean {
    return this.consume(key, limit, windowMs).allowed;
  }

  consume(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const safeLimit = Math.max(1, Number(limit) || 1);
    const safeWindowMs = Math.max(1000, Number(windowMs) || 60_000);
    const bucket = this.getBucket(key, safeWindowMs, now, true);

    bucket.count += 1;

    const allowed = bucket.count <= safeLimit;
    const remaining = Math.max(0, safeLimit - bucket.count);
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

    this.cleanup(now);

    return {
      allowed,
      key,
      count: bucket.count,
      remaining,
      limit: safeLimit,
      resetAt: bucket.resetAt,
      retryAfterSec,
    };
  }

  peek(key: string, limit: number, windowMs: number): RateLimitResult {
    const now = Date.now();
    const safeLimit = Math.max(1, Number(limit) || 1);
    const safeWindowMs = Math.max(1000, Number(windowMs) || 60_000);
    const bucket = this.getBucket(key, safeWindowMs, now, false);

    const count = bucket?.count || 0;
    const resetAt = bucket?.resetAt || now + safeWindowMs;
    const remaining = Math.max(0, safeLimit - count);
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));

    return {
      allowed: count < safeLimit,
      key,
      count,
      remaining,
      limit: safeLimit,
      resetAt,
      retryAfterSec,
    };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  resetPrefix(prefix: string): number {
    let count = 0;

    for (const key of this.buckets.keys()) {
      if (key.startsWith(prefix)) {
        this.buckets.delete(key);
        count += 1;
      }
    }

    return count;
  }

  size(): number {
    return this.buckets.size;
  }

  private getBucket(
    key: string,
    windowMs: number,
    now: number,
    create: true,
  ): RateLimitBucket;

  private getBucket(
    key: string,
    windowMs: number,
    now: number,
    create: false,
  ): RateLimitBucket | undefined;

  private getBucket(
    key: string,
    windowMs: number,
    now: number,
    create: boolean,
  ): RateLimitBucket | undefined {
    const existing = this.buckets.get(key);

    if (existing && now < existing.resetAt) {
      return existing;
    }

    if (!create) return undefined;

    const fresh = {
      count: 0,
      resetAt: now + windowMs,
    };

    this.buckets.set(key, fresh);
    return fresh;
  }

  private cleanup(now: number): void {
    if (this.buckets.size < 10_000) return;

    for (const [key, bucket] of this.buckets.entries()) {
      if (now >= bucket.resetAt) {
        this.buckets.delete(key);
      }
    }
  }
}
