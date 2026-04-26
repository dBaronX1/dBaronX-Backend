import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { CacheTTLService } from "../services/cache-ttl.service";
import { HttpUtil } from "../utils/http.util";

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cache: CacheTTLService,
    private readonly config: ConfigService,
  ) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    const method = String(request?.method || "GET").toUpperCase();
    if (method !== "GET") {
      return next.handle();
    }

    const authorization = String(request?.headers?.authorization || "");
    if (authorization) {
      return next.handle();
    }

    const rawPath = String(request?.originalUrl || request?.url || "");
    if (!rawPath || rawPath.includes("/health")) {
      return next.handle();
    }

    const ttlSeconds = Number(
      this.config.get<number>("CACHE_TTL_SECONDS") ||
        process.env.CACHE_TTL_SECONDS ||
        30,
    );

    const cacheKey = `http:get:${rawPath}`;
    const cached = this.cache.get<unknown>(cacheKey);

    if (cached !== null) {
      const response = context.switchToHttp().getResponse();
      if (response?.setHeader) {
        response.setHeader("x-cache", "HIT");
      }
      return of(cached);
    }

    return next.handle().pipe(
      tap((payload: unknown) => {
        if (
          payload &&
          typeof payload === "object" &&
          "success" in (payload as Record<string, unknown>) &&
          (payload as Record<string, unknown>).success === false
        ) {
          return;
        }

        const response = context.switchToHttp().getResponse();
        if (response?.setHeader) {
          response.setHeader("x-cache", "MISS");
        }

        this.cache.set(cacheKey, payload, ttlSeconds);
      }),
    );
  }
}
