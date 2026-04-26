import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import { NextFunction, Request, Response } from "express";

export interface RequestContextState {
  requestId: string;
  actorId: string | null;
  callerService: string | null;
  callerSurface: string | null;
  startedAtMs: number;
}

export interface RequestWithContext extends Request {
  context?: RequestContextState;
}

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestContextMiddleware.name);

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const requestId =
      String(req.headers["x-request-id"] || "").trim() || randomUUID();

    req.context = {
      requestId,
      actorId: this.header(req, "x-actor-id"),
      callerService: this.header(req, "x-caller-service"),
      callerSurface: this.header(req, "x-caller-surface"),
      startedAtMs: Date.now(),
    };

    res.setHeader("x-request-id", requestId);

    res.on("finish", () => {
      const durationMs = Date.now() - (req.context?.startedAtMs || Date.now());
      res.setHeader("x-response-time-ms", String(durationMs));

      this.logger.log(
        JSON.stringify({
          requestId,
          method: req.method,
          path: req.originalUrl,
          statusCode: res.statusCode,
          durationMs,
          actorId: req.context?.actorId || null,
          callerService: req.context?.callerService || null,
          callerSurface: req.context?.callerSurface || null,
          timestamp: new Date().toISOString(),
        }),
      );
    });

    next();
  }

  private header(req: Request, name: string): string | null {
    const value = req.headers[name];
    if (typeof value !== "string") {
      return null;
    }
    const cleaned = value.trim();
    return cleaned || null;
  }
}
