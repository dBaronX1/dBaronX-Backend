import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { SecurityUtil } from "../utils/security.util";

type RequestLogMeta = {
  requestId: string;
  correlationId: string;
  reference: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs: number;
  userId?: string | null;
  ip?: string;
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      method?: string;
      originalUrl?: string;
      url?: string;
      ip?: string;
      context?: {
        requestId?: string;
      };
      user?: {
        id?: string;
        sub?: string;
      };
    }>();

    const response = context.switchToHttp().getResponse<{
      statusCode?: number;
    }>();

    const startedAt = Date.now();
    const requestId =
      String(request.headers["x-request-id"] || request.context?.requestId || "").trim();
    const correlationId = requestId;
    const reference = this.buildPublicReference(requestId);
    const method = request.method || "";
    const path = request.originalUrl || request.url || "";
    const userId = String(request.user?.id || request.user?.sub || "").trim() || null;
    const ip = String(request.headers["x-forwarded-for"] || "")
      .split(",")[0]
      ?.trim() || request.ip || "";

    const buildMeta = (statusCode?: number): RequestLogMeta => ({
      requestId,
      correlationId,
      reference,
      method,
      path,
      statusCode,
      durationMs: Date.now() - startedAt,
      userId,
      ip,
    });

    return next.handle().pipe(
      tap(() => {
        const meta = buildMeta(response.statusCode || 200);
        this.logger.log(
          JSON.stringify({
            level: "info",
            ...meta,
            timestamp: new Date().toISOString(),
          }),
        );
      }),
      catchError((error: unknown) => {
        const statusCode =
          error instanceof HttpException
            ? error.getStatus()
            : typeof (error as { status?: unknown })?.status === "number"
              ? ((error as { status: number }).status)
              : 500;

        const meta = buildMeta(statusCode);
        const redactedErrorMeta = this.extractErrorMeta(error);

        this.logger.error(
          JSON.stringify({
            level: "error",
            ...meta,
            message:
              error instanceof Error
                ? error.message
                : "Unhandled request failure",
            errorMeta: redactedErrorMeta,
            timestamp: new Date().toISOString(),
          }),
        );

        return throwError(() => error);
      }),
    );
  }

  private extractErrorMeta(error: unknown): Record<string, unknown> | null {
    if (!(error instanceof HttpException)) {
      return null;
    }

    const response = error.getResponse();
    if (!response || typeof response !== "object" || Array.isArray(response)) {
      return null;
    }

    return SecurityUtil.redactObject(response as Record<string, unknown>);
  }

  private buildPublicReference(requestId: string): string {
    const normalized = String(requestId || "").replace(/[^a-zA-Z0-9]/g, "");
    const suffix = normalized.slice(-12) || `${Date.now()}`;

    return `ref_${suffix}`;
  }
}
