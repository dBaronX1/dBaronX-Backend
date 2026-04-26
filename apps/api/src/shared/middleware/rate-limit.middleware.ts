import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";
import { RateLimitService } from "../services/rate-limit.service";

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
  user?: {
    id?: string;
    sub?: string;
  };
};

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly bypassPrefixes = [
    "/health",
    "/api/health",
    "/api/v1/health",
    "/api/v1/payments/webhook",
    "/api/v1/supplier-webhooks",
    "/api/v1/telegram/webhook",
  ];

  constructor(
    private readonly config: ConfigService,
    private readonly rateLimit: RateLimitService,
  ) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const path = String(req.originalUrl || req.url || "");

    if (this.shouldBypass(path)) {
      next();
      return;
    }

    const limit = this.numberFromConfig("GLOBAL_RATE_LIMIT_MAX", 240);
    const windowMs = this.numberFromConfig("GLOBAL_RATE_LIMIT_WINDOW_MS", 60_000);
    const key = this.buildKey(req);
    const result = this.rateLimit.consume(key, limit, windowMs);

    res.setHeader("x-ratelimit-limit", String(result.limit));
    res.setHeader("x-ratelimit-remaining", String(result.remaining));
    res.setHeader("x-ratelimit-reset", String(Math.floor(result.resetAt / 1000)));

    req.context = {
      ...(req.context || {}),
      rateLimitKey: key,
      rateLimitRemaining: result.remaining,
    };

    if (!result.allowed) {
      res.setHeader("retry-after", String(result.retryAfterSec));

      res.status(429).json({
        success: false,
        statusCode: 429,
        code: "RATE_LIMITED",
        error: "TooManyRequests",
        message: "Too many requests",
        retryAfterSec: result.retryAfterSec,
        requestId: req.context?.requestId || req.headers["x-request-id"] || null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  }

  private shouldBypass(path: string): boolean {
    return this.bypassPrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }

  private buildKey(req: RequestWithContext): string {
    const userId = String(req.user?.id || req.user?.sub || "").trim();
    const ip = this.extractIp(req);
    const method = String(req.method || "GET").toUpperCase();
    const routeGroup = String(req.route?.path || req.path || req.originalUrl || "unknown");

    if (userId) {
      return `mw:user:${userId}:${method}:${routeGroup}`;
    }

    return `mw:ip:${ip}:${method}:${routeGroup}`;
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    if (typeof value === "string" && value.trim()) {
      return this.normalizeIp(value.split(",")[0] || "");
    }

    return this.normalizeIp(req.ip || req.socket?.remoteAddress || "unknown");
  }

  private normalizeIp(raw: string): string {
    const value = String(raw || "").trim();
    if (value === "::1") return "127.0.0.1";
    if (value.startsWith("::ffff:")) return value.replace("::ffff:", "");
    return value || "unknown";
  }

  private numberFromConfig(key: string, fallback: number): number {
    const value = Number(this.config.get<number>(key) || process.env[key] || fallback);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
}
