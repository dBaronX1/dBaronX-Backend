import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { HttpUtil } from "../utils/http.util";

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
  user?: {
    id?: string;
    sub?: string;
    email?: string;
    role?: string;
  };
};

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const startedAt = Date.now();

    const requestId =
      String(req.context?.requestId || req.headers["x-request-id"] || "").trim() ||
      "unknown";

    const method = String(req.method || "GET").toUpperCase();
    const path = String(req.originalUrl || req.url || "");
    const ip = this.extractIp(req);
    const userAgent = String(req.headers["user-agent"] || "");
    const userId = String(req.user?.id || req.user?.sub || "").trim() || null;

    req.context = {
      ...(req.context || {}),
      requestId,
      startedAt,
      ip,
      method,
      path,
      userAgent,
      userId,
    };

    this.logger.log(
      JSON.stringify({
        event: "http.request.started",
        requestId,
        method,
        path,
        ip,
        userId,
        userAgent,
        timestamp: new Date(startedAt).toISOString(),
      }),
    );

    res.on("finish", () => {
      const durationMs = Math.max(0, Date.now() - startedAt);

      const payload = {
        event: "http.request.completed",
        requestId,
        method,
        path,
        ip,
        userId,
        statusCode: res.statusCode,
        durationMs,
        contentLength: this.normalizeContentLength(res.getHeader("content-length")),
        userAgent,
        headers: HttpUtil.redactHeaders(req.headers as Record<string, unknown>),
        timestamp: new Date().toISOString(),
      };

      if (res.statusCode >= 500) {
        this.logger.error(JSON.stringify(payload));
        return;
      }

      if (res.statusCode >= 400) {
        this.logger.warn(JSON.stringify(payload));
        return;
      }

      this.logger.log(JSON.stringify(payload));
    });

    next();
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    if (typeof forwardedValue === "string" && forwardedValue.trim()) {
      return forwardedValue.split(",")[0]?.trim() || "";
    }

    const raw = req.ip || req.socket?.remoteAddress || "";
    if (raw === "::1") return "127.0.0.1";
    if (raw.startsWith("::ffff:")) return raw.replace("::ffff:", "");

    return raw;
  }

  private normalizeContentLength(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}


38. `apps/api/src/shared/middleware/security.middleware.ts`


import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly oneYearSeconds = 31_536_000;

  use(req: Request, res: Response, next: NextFunction): void {
    const isSecure =
      req.secure ||
      String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";

    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    res.setHeader(
      "Permissions-Policy",
      [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=(self)",
        "fullscreen=(self)",
        "clipboard-read=(self)",
        "clipboard-write=(self)",
      ].join(", "),
    );

    if (isSecure) {
      res.setHeader(
        "Strict-Transport-Security",
        `max-age=${this.oneYearSeconds}; includeSubDomains; preload`,
      );
    }

    next();
  }
}


39. `apps/api/src/shared/middleware/maintenance.middleware.ts`


import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
};

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  private readonly allowedPrefixes = [
    "/",
    "/health",
    "/health/live",
    "/health/ready",
    "/api/health",
    "/api/health/live",
    "/api/health/ready",
    "/api/v1/health",
    "/api/v1/health/live",
    "/api/v1/health/ready",
    "/api/v1/payments/webhook",
    "/api/v1/supplier-webhooks",
    "/api/v1/telegram/webhook",
  ];

  constructor(private readonly config: ConfigService) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    if (!this.isMaintenanceEnabled()) {
      next();
      return;
    }

    const path = String(req.originalUrl || req.url || "");

    if (this.isAllowedDuringMaintenance(path)) {
      next();
      return;
    }

    res.status(503).json({
      success: false,
      statusCode: 503,
      code: "MAINTENANCE_MODE",
      error: "ServiceUnavailable",
      message: "Service is temporarily under maintenance",
      path,
      method: req.method,
      requestId: req.context?.requestId || req.headers["x-request-id"] || null,
      timestamp: new Date().toISOString(),
    });
  }

  private isMaintenanceEnabled(): boolean {
    const raw = String(
      this.config.get<string>("MAINTENANCE_MODE") ||
        process.env.MAINTENANCE_MODE ||
        "false",
    ).toLowerCase();

    return ["1", "true", "yes", "on"].includes(raw);
  }

  private isAllowedDuringMaintenance(path: string): boolean {
    return this.allowedPrefixes.some(
      (prefix) => path === prefix || path.startsWith(`${prefix}/`),
    );
  }
}


40. `apps/api/src/shared/middleware/ip-block.middleware.ts`
