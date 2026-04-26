import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

type SuccessEnvelope<T> = {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    path: string;
    method: string;
    durationMs: number | null;
  };
};

function isAlreadyEnveloped(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;

  const record = value as Record<string, unknown>;
  return (
    typeof record.success === "boolean" &&
    "meta" in record &&
    typeof record.meta === "object"
  );
}

@Injectable()
export class ResponseTransformInterceptor<T>
  implements NestInterceptor<T, SuccessEnvelope<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessEnvelope<T>> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      originalUrl?: string;
      url?: string;
      method?: string;
      context?: {
        startedAt?: number;
      };
    }>();

    const requestId = String(request.headers["x-request-id"] || "");
    const path = request.originalUrl || request.url || "";
    const method = request.method || "";
    const startedAt =
      typeof request.context?.startedAt === "number"
        ? request.context.startedAt
        : null;

    return next.handle().pipe(
      map((value) => {
        if (isAlreadyEnveloped(value)) {
          return value as SuccessEnvelope<T>;
        }

        return {
          success: true,
          statusCode: 200,
          message: "OK",
          data: value as T,
          meta: {
            requestId,
            timestamp: new Date().toISOString(),
            path,
            method,
            durationMs: startedAt ? Math.max(0, Date.now() - startedAt) : null,
          },
        };
      }),
    );
  }
}
