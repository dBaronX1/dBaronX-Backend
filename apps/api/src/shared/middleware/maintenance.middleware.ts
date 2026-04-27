import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const ALLOWED_PREFIXES = [
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
];

type RequestWithContext = Request & { context?: Record<string, unknown> };

function isMaintenanceEnabled(): boolean {
  const raw = String(process.env.MAINTENANCE_MODE || "false").toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

function isAllowedDuringMaintenance(path: string): boolean {
  return ALLOWED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function maintenanceMiddleware(
  req: RequestWithContext,
  res: Response,
  next: NextFunction,
): void {
  if (!isMaintenanceEnabled()) {
    next();
    return;
  }

  const path = req.originalUrl || req.url || "";

  if (isAllowedDuringMaintenance(path)) {
    next();
    return;
  }

  const requestId = String(req.headers["x-request-id"] || req.context?.["requestId"] || "");

  res.status(503).json({
    success: false,
    statusCode: 503,
    code: "MAINTENANCE_MODE",
    error: "ServiceUnavailable",
    message: "Service is temporarily under maintenance",
    path,
    method: req.method,
    requestId,
    timestamp: new Date().toISOString(),
  });
}

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    maintenanceMiddleware(req, res, next);
  }
}
