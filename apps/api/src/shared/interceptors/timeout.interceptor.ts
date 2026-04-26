import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  RequestTimeoutException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable, TimeoutError, throwError } from "rxjs";
import { catchError, timeout } from "rxjs/operators";

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly config: ConfigService) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    const timeoutMs = Number(
      this.config.get<number>("REQUEST_TIMEOUT_MS") ||
        process.env.REQUEST_TIMEOUT_MS ||
        15_000,
    );

    return next.handle().pipe(
      timeout(timeoutMs),
      catchError((error: unknown) => {
        if (error instanceof TimeoutError) {
          return throwError(
            () =>
              new RequestTimeoutException({
                success: false,
                statusCode: 408,
                message: "Request timed out",
                path: request?.originalUrl || request?.url || "",
                requestId: request?.context?.requestId || undefined,
              }),
          );
        }

        return throwError(() => error);
      }),
    );
  }
}
