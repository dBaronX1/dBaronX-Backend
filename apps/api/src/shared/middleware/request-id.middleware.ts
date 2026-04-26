import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
};

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const incoming = this.normalizeHeader(req.headers["x-request-id"]);
    const requestId = this.isSafeRequestId(incoming)
      ? incoming
      : this.createRequestId();

    req.headers["x-request-id"] = requestId;

    req.context = {
      ...(req.context || {}),
      requestId,
    };

    res.setHeader("x-request-id", requestId);

    next();
  }

  private normalizeHeader(value: unknown): string {
    if (Array.isArray(value)) {
      return String(value[0] || "").trim();
    }

    return String(value || "").trim();
  }

  private isSafeRequestId(value: string): boolean {
    if (!value) return false;
    if (value.length > 128) return false;
    return /^[a-zA-Z0-9._:-]+$/.test(value);
  }

  private createRequestId(): string {
    return `req_${randomUUID().replace(/-/g, "")}`;
  }
}
