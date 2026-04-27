import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

const ONE_YEAR_SECONDS = 31_536_000;

export function securityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const isSecure =
    req.secure ||
    String(req.headers["x-forwarded-proto"] || "").toLowerCase() === "https";

  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",
      "fullscreen=(self)",
    ].join(", "),
  );
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  res.setHeader("X-DNS-Prefetch-Control", "off");

  if (isSecure) {
    res.setHeader(
      "Strict-Transport-Security",
      `max-age=${ONE_YEAR_SECONDS}; includeSubDomains; preload`,
    );
  }

  next();
}

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    securityMiddleware(req, res, next);
  }
}
