import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RateLimitService } from "../services/rate-limit.service";
import { IpUtil } from "../utils/ip.util";

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimit: RateLimitService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const limit = Number(
      this.config.get<number>("RATE_LIMIT_MAX") ||
        process.env.RATE_LIMIT_MAX ||
        120,
    );

    const windowMs = Number(
      this.config.get<number>("RATE_LIMIT_WINDOW_MS") ||
        process.env.RATE_LIMIT_WINDOW_MS ||
        60_000,
    );

    const ip = IpUtil.normalize(
      IpUtil.extract(request.headers as Record<string, unknown>, request.ip || "unknown"),
    );

    const route = String(request.route?.path || request.path || request.url || "unknown");
    const method = String(request.method || "GET").toUpperCase();
    const userId = String(request.user?.id || request.user?.sub || "anon");

    const key = `guard:${method}:${route}:${userId}:${ip}`;

    const result = this.rateLimit.consume(key, limit, windowMs);

    response.setHeader("x-rate-limit-limit", String(result.limit));
    response.setHeader("x-rate-limit-remaining", String(result.remaining));
    response.setHeader("x-rate-limit-reset", String(Math.floor(result.resetAt / 1000)));

    if (!result.allowed) {
      response.setHeader("retry-after", String(result.retryAfterSec));

      throw new HttpException({
        success: false,
        statusCode: 429,
        message: "Too many requests",
        retryAfterSec: result.retryAfterSec,
        key,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
