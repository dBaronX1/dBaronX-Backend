import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { randomUUID } from "crypto";

export type RequestContextPayload = {
  requestId: string;
  startedAt: number;
  startedAtIso: string;
  ip: string;
  forwardedFor: string;
  userAgent: string;
  method: string;
  path: string;
  userId?: string;
  role?: string;
};

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<
      Record<string, any> & {
        context?: RequestContextPayload;
        user?: Record<string, any>;
      }
    >();

    const requestId =
      String(req.headers?.["x-request-id"] || "").trim() || this.buildRequestId();

    const forwardedFor =
      typeof req.headers?.["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"]
        : "";

    const ip =
      forwardedFor.split(",")[0]?.trim() ||
      req.ip ||
      req.socket?.remoteAddress ||
      "unknown";

    const payload: RequestContextPayload = {
      requestId,
      startedAt: Date.now(),
      startedAtIso: new Date().toISOString(),
      ip,
      forwardedFor,
      userAgent: String(req.headers?.["user-agent"] || ""),
      method: req.method || "UNKNOWN",
      path: req.originalUrl || req.url || "/",
      ...(req.user?.sub || req.user?.id ? { userId: String(req.user.sub || req.user.id) } : {}),
      ...(req.user?.role ? { role: String(req.user.role) } : {}),
    };

    req.context = payload;
    req.headers["x-request-id"] = requestId;

    return next.handle().pipe(
      tap({
        next: () => {
          if (req.context && (!req.context.userId || !req.context.role) && req.user) {
            req.context.userId = req.context.userId || String(req.user.sub || req.user.id || "");
            req.context.role = req.context.role || String(req.user.role || "");
          }
        },
      }),
    );
  }

  private buildRequestId(): string {
    return `req_${randomUUID().replace(/-/g, "")}`;
  }
}
