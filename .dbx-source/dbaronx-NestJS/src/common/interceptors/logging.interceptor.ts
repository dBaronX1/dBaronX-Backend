import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<any>();
    const { method, originalUrl, requestId } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse<any>();
        const duration = Date.now() - startedAt;

        this.logger.log(
          `[${requestId || 'n/a'}] ${method} ${originalUrl} ${response.statusCode} ${duration}ms`,
        );
      }),
    );
  }
}