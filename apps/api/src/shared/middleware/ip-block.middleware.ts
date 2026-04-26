import { NextFunction, Request, Response } from "express";

function parseBlockedIps(): Set<string> {
  return new Set(
    String(process.env.BLOCKED_IPS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function extractIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const forwardedValue = Array.isArray(forwarded) ? forwarded[0] : forwarded;

  if (typeof forwardedValue === "string" && forwardedValue.trim()) {
    return forwardedValue.split(",")[0].trim();
  }

  return req.ip || "";
}

export function ipBlockMiddleware(
  req: Request & { context?: Record<string, unknown> },
  res: Response,
  next: NextFunction,
): void {
  const blockedIps = parseBlockedIps();
  const ip = extractIp(req);

  if (!ip || !blockedIps.has(ip)) {
    next();
    return;
  }

  const requestId = String(req.headers["x-request-id"] || req.context?.["requestId"] || "");

  res.status(403).json({
    success: false,
    statusCode: 403,
    code: "IP_BLOCKED",
    error: "Forbidden",
    message: "Access denied",
    requestId,
    path: req.originalUrl || req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
}
