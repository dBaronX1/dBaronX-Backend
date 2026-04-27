import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

type RequestWithContext = Request & { context?: Record<string, unknown> };

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: RequestWithContext, _res: Response, next: NextFunction): void {
    const requestId = String(req.headers["x-request-id"] || req.context?.["requestId"] || "");

    console.log(
      JSON.stringify({
        event: "http_request_received",
        requestId,
        method: req.method,
        path: req.originalUrl || req.url,
        timestamp: new Date().toISOString(),
      }),
    );

    next();
  }

  static logRequest(req: Request, res: Response, next: NextFunction): void {
    new RequestLoggerMiddleware().use(req as RequestWithContext, res, next);
  }
}
