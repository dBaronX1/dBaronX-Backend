import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

type DbxClientContext = {
  userAgent: string;
  normalizedUserAgent: string;
  platform: "ios" | "android" | "windows" | "macos" | "linux" | "unknown";
  deviceClass: "mobile" | "tablet" | "desktop";
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isBotLike: boolean;
  isKnownSecurityScanner: boolean;
};

type RequestWithContext = Request & {
  context?: Record<string, unknown>;
  dbxClient?: DbxClientContext;
};

@Injectable()
export class UserAgentMiddleware implements NestMiddleware {
  private readonly blockedSignatures = [
    "sqlmap",
    "nikto",
    "dirbuster",
    "masscan",
    "acunetix",
    "nessus",
    "nmap scripting engine",
    "zgrab",
    "wpscan",
    "gobuster",
    "ffuf",
  ];

  private readonly botSignatures = [
    "bot",
    "crawler",
    "spider",
    "slurp",
    "bingpreview",
    "facebookexternalhit",
    "headless",
    "phantom",
    "selenium",
    "playwright",
    "puppeteer",
  ];

  use(req: RequestWithContext, res: Response, next: NextFunction): void {
    const userAgent = this.header(req.headers["user-agent"]);
    const normalizedUserAgent = userAgent.toLowerCase();

    const isKnownSecurityScanner = this.blockedSignatures.some((signature) =>
      normalizedUserAgent.includes(signature),
    );

    const isTablet = /ipad|tablet|android(?!.*mobile)/i.test(userAgent);
    const isMobile =
      !isTablet && /mobile|iphone|ipod|android|opera mini|iemobile/i.test(userAgent);
    const isBotLike =
      isKnownSecurityScanner ||
      this.botSignatures.some((signature) => normalizedUserAgent.includes(signature));

    const dbxClient: DbxClientContext = {
      userAgent,
      normalizedUserAgent,
      platform: this.detectPlatform(userAgent),
      deviceClass: isMobile ? "mobile" : isTablet ? "tablet" : "desktop",
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      isBotLike,
      isKnownSecurityScanner,
    };

    req.dbxClient = dbxClient;
    req.context = {
      ...(req.context || {}),
      userAgent,
      platform: dbxClient.platform,
      deviceClass: dbxClient.deviceClass,
      isBotLike,
    };

    res.setHeader("x-dbx-device-class", dbxClient.deviceClass);
    res.setHeader("x-dbx-platform", dbxClient.platform);

    if (isKnownSecurityScanner) {
      res.status(403).json({
        success: false,
        statusCode: 403,
        code: "USER_AGENT_BLOCKED",
        error: "Forbidden",
        message: "Access denied",
        requestId: req.context?.requestId || req.headers["x-request-id"] || null,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    next();
  }

  private header(value: unknown): string {
    if (Array.isArray(value)) return String(value[0] || "").trim();
    return String(value || "").trim();
  }

  private detectPlatform(userAgent: string): DbxClientContext["platform"] {
    if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
    if (/android/i.test(userAgent)) return "android";
    if (/windows/i.test(userAgent)) return "windows";
    if (/macintosh|mac os x/i.test(userAgent)) return "macos";
    if (/linux/i.test(userAgent)) return "linux";
    return "unknown";
  }
}
