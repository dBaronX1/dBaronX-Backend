import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
};

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggerMiddleware.name);

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const { method, originalUrl, context } = req;
    const requestId = String(context?.["requestId"] || "");
    
    this.logger.debug(
      `[${requestId}] ${method} ${originalUrl}`,
      RequestLoggerMiddleware.name,
    );
    
    next();
  }
}