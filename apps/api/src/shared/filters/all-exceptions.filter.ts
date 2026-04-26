import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

type JsonLike = Record<string, unknown>;

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<
      Request & {
        context?: Record<string, unknown>;
        user?: Record<string, unknown>;
      }
    >();

    const status = this.resolveStatus(exception);
    const normalized = this.normalizeException(exception, status);

    const requestId = this.extractRequestId(request);
    const startedAt = this.resolveStartedAt(request);
    const durationMs = startedAt ? Math.max(0, Date.now() - startedAt) : undefined;

    const body: JsonLike = {
      success: false,
      statusCode: status,
      error: normalized.error,
      message: normalized.message,
      code: normalized.code,
      path: request.originalUrl || request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
      requestId,
      details: normalized.details ?? null,
    };

    if (durationMs !== undefined) {
      body["durationMs"] = durationMs;
    }

    this.logException({
      status,
      requestId,
      method: request.method,
      path: request.originalUrl || request.url,
      userId: this.extractUserId(request),
      ip: this.extractIp(request),
      durationMs,
      error: normalized.error,
      code: normalized.code,
      message: normalized.message,
      details: normalized.details,
      stack: normalized.stack,
    });

    response.status(status).json(body);
  }

  private resolveStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private normalizeException(
    exception: unknown,
    status: number,
  ): {
    error: string;
    message: string | string[];
    code: string;
    details?: unknown;
    stack?: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (typeof response === "string") {
        return {
          error: exception.name || "HttpException",
          message: response,
          code: this.defaultCodeForStatus(status),
          stack: exception.stack,
        };
      }

      if (this.isObject(response)) {
        const message =
          (response["message"] as string | string[] | undefined) ||
          exception.message ||
          "Request failed";

        const error =
          String(response["error"] || exception.name || "HttpException");

        const code =
          String(response["code"] || this.defaultCodeForStatus(status));

        const details =
          response["details"] ??
          response["errors"] ??
          response["meta"] ??
          undefined;

        return {
          error,
          message,
          code,
          details,
          stack: exception.stack,
        };
      }

      return {
        error: exception.name || "HttpException",
        message: exception.message || "Request failed",
        code: this.defaultCodeForStatus(status),
        stack: exception.stack,
      };
    }

    if (exception instanceof Error) {
      return {
        error: exception.name || "Error",
        message:
          status >= 500
            ? "Internal server error"
            : exception.message || "Request failed",
        code: this.defaultCodeForStatus(status),
        details:
          status >= 500
            ? undefined
            : {
                originalMessage: exception.message,
              },
        stack: exception.stack,
      };
    }

    return {
      error: "UnknownError",
      message: "Internal server error",
      code: this.defaultCodeForStatus(status),
    };
  }

  private logException(input: {
    status: number;
    requestId: string;
    method?: string;
    path?: string;
    userId?: string | null;
    ip?: string;
    durationMs?: number;
    error: string;
    code: string;
    message: string | string[];
    details?: unknown;
    stack?: string;
  }): void {
    const payload = {
      requestId: input.requestId,
      status: input.status,
      method: input.method || "",
      path: input.path || "",
      userId: input.userId || null,
      ip: input.ip || "",
      durationMs: input.durationMs,
      error: input.error,
      code: input.code,
      message: input.message,
      details: input.details ?? null,
    };

    if (input.status >= 500) {
      this.logger.error(JSON.stringify(payload), input.stack);
      return;
    }

    if (input.status >= 400) {
      this.logger.warn(JSON.stringify(payload));
      return;
    }

    this.logger.log(JSON.stringify(payload));
  }

  private extractRequestId(
    request: Request & { context?: Record<string, unknown> },
  ): string {
    const headerValue = request.headers["x-request-id"];
    const fromHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const fromContext = request.context?.["requestId"];

    return String(fromHeader || fromContext || `req_${Date.now()}`);
  }

  private resolveStartedAt(
    request: Request & { context?: Record<string, unknown> },
  ): number | undefined {
    const raw = request.context?.["startedAt"];

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }

    return undefined;
  }

  private extractUserId(
    request: Request & { user?: Record<string, unknown> },
  ): string | null {
    const user = request.user || {};
    const raw = user["sub"] ?? user["id"] ?? null;

    return raw ? String(raw) : null;
  }

  private extractIp(request: Request): string {
    const forwarded = request.headers["x-forwarded-for"];
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;

    if (typeof value === "string" && value.trim()) {
      return value.split(",")[0].trim();
    }

    return request.ip || "";
  }

  private isObject(value: unknown): value is JsonLike {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case 400:
        return "BAD_REQUEST";
      case 401:
        return "UNAUTHORIZED";
      case 403:
        return "FORBIDDEN";
      case 404:
        return "NOT_FOUND";
      case 408:
        return "REQUEST_TIMEOUT";
      case 409:
        return "CONFLICT";
      case 413:
        return "PAYLOAD_TOO_LARGE";
      case 422:
        return "UNPROCESSABLE_ENTITY";
      case 429:
        return "RATE_LIMITED";
      default:
        return status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
    }
  }
}
