import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable, throwError, timer } from "rxjs";
import { mergeMap, retryWhen, scan } from "rxjs/operators";
import { HttpUtil } from "../utils/http.util";

@Injectable()
export class RetryInterceptor implements NestInterceptor {
  constructor(private readonly config?: ConfigService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      method?: string;
      headers?: Record<string, unknown>;
    }>();

    const method = String(request.method || "GET").toUpperCase();
    const idempotencyKey = String(request.headers?.["idempotency-key"] || "").trim();

    const isSafeMethod = ["GET", "HEAD", "OPTIONS"].includes(method);
    const isIdempotentWrite = Boolean(idempotencyKey) && ["POST", "PUT", "PATCH"].includes(method);

    if (!isSafeMethod && !isIdempotentWrite) {
      return next.handle();
    }

    const maxRetries = this.numberFromConfig("HTTP_RETRY_ATTEMPTS", 1);
    const retryDelayMs = this.numberFromConfig("HTTP_RETRY_DELAY_MS", 150);

    if (maxRetries <= 0) {
      return next.handle();
    }

    return next.handle().pipe(
      retryWhen((errors) =>
        errors.pipe(
          scan(
            (state, error: unknown) => {
              const nextAttempt = state.attempt + 1;

              if (nextAttempt > maxRetries || !this.isRetryable(error)) {
                throw error;
              }

              return {
                attempt: nextAttempt,
                error,
              };
            },
            { attempt: 0, error: null as unknown },
          ),
          mergeMap((state) => timer(retryDelayMs * state.attempt)),
        ),
      ),
    );
  }

  private isRetryable(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const record = error as Record<string, unknown>;
    const status = typeof record.status === "number" ? record.status : null;
    const code = typeof record.code === "string" ? record.code : null;
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(record.message || "").toLowerCase();

    if (status !== null) {
      return HttpUtil.isRetryableStatus(status);
    }

    if (
      code &&
      [
        "ECONNRESET",
        "ECONNREFUSED",
        "ETIMEDOUT",
        "EAI_AGAIN",
        "UND_ERR_CONNECT_TIMEOUT",
      ].includes(code)
    ) {
      return true;
    }

    return (
      message.includes("timeout") ||
      message.includes("temporarily unavailable") ||
      message.includes("socket hang up")
    );
  }

  private numberFromConfig(key: string, fallback: number): number {
    const value = Number(this.config?.get<number>(key) || process.env[key] || fallback);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  }
}
