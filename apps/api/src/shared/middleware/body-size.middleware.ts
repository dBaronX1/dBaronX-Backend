import { Injectable, NestMiddleware } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";

type BodyLimitRule = {
  pattern: RegExp;
  envKey?: string;
  defaultBytes: number;
};

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
};

@Injectable()
export class BodySizeMiddleware implements NestMiddleware {
  private readonly rules: BodyLimitRule[] = [
    {
      pattern: /^\/api\/v1\/files\/upload/i,
      envKey: "MAX_UPLOAD_BODY_BYTES",
      defaultBytes: 12 * 1024 * 1024,
    },
    {
      pattern: /^\/api\/v1\/payments\/webhook/i,
      envKey: "MAX_WEBHOOK_BODY_BYTES",
      defaultBytes: 2 * 1024 * 1024,
    },
    {
      pattern: /^\/api\/v1\/supplier-webhooks/i,
      envKey: "MAX_WEBHOOK_BODY_BYTES",
      defaultBytes: 2 * 1024 * 1024,
    },
    {
      pattern: /^\/api\/v1\/telegram\/webhook/i,
      envKey: "MAX_WEBHOOK_BODY_BYTES",
      defaultBytes: 2 * 1024 * 1024,
    },
  ];

  constructor(private readonly config: ConfigService) {}

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const path = String(req.originalUrl || req.url || "");
    const maxBytes = this.resolveLimit(path);
    const contentLength = this.parseContentLength(req.headers["content-length"]);

    req.context = {
      ...(req.context || {}),
      bodyLimitBytes: maxBytes,
      contentLength,
    };

    if (contentLength === null) {
      next();
      return;
    }

    if (contentLength < 0) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        code: "INVALID_CONTENT_LENGTH",
        error: "BadRequest",
        message: "Invalid Content-Length header",
        requestId: req.context?.requestId || req.headers["x-request-id"] || null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (contentLength > maxBytes) {
      res.status(413).json({
        success: false,
        statusCode: 413,
        code: "PAYLOAD_TOO_LARGE",
        error: "PayloadTooLarge",
        message: `Payload exceeds ${maxBytes} bytes`,
        maxBytes,
        contentLength,
        requestId: req.context?.requestId || req.headers["x-request-id"] || null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  }

  private resolveLimit(path: string): number {
    const matched = this.rules.find((rule) => rule.pattern.test(path));

    if (matched) {
      return this.numberFromConfig(matched.envKey, matched.defaultBytes);
    }

    return this.numberFromConfig("MAX_BODY_BYTES", 2 * 1024 * 1024);
  }

  private numberFromConfig(envKey: string | undefined, fallback: number): number {
    if (!envKey) return fallback;

    const raw = Number(this.config.get<number>(envKey) || process.env[envKey] || fallback);
    return Number.isFinite(raw) && raw > 0 ? raw : fallback;
  }

  private parseContentLength(value: unknown): number | null {
    const raw = Array.isArray(value) ? value[0] : value;

    if (raw === undefined || raw === null || raw === "") {
      return null;
    }

    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : -1;
  }
}
