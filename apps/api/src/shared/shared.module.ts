import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { DatabaseModule } from "./database/database.module";

import { AllExceptionsFilter } from "./filters/all-exceptions.filter";

import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { InternalAuthGuard } from "./guards/internal-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { RateLimitGuard } from "./guards/rate-limit.guard";

import { RequestIdMiddleware } from "./middleware/request-id.middleware";
import { RequestLoggerMiddleware } from "./middleware/request-logger.middleware";
import { SecurityMiddleware } from "./middleware/security.middleware";
import { MaintenanceMiddleware } from "./middleware/maintenance.middleware";
import { IpBlockMiddleware } from "./middleware/ip-block.middleware";
import { UserAgentMiddleware } from "./middleware/user-agent.middleware";
import { BodySizeMiddleware } from "./middleware/body-size.middleware";
import { RateLimitMiddleware } from "./middleware/rate-limit.middleware";

import { TimeoutInterceptor } from "./interceptors/timeout.interceptor";
import { RetryInterceptor } from "./interceptors/retry.interceptor";

import { AppLoggerService } from "./services/app-logger.service";
import { AuthJwtService } from "./services/auth.jwt.service";
import { AuthSessionService } from "./services/auth.session.service";
import { CacheTTLService } from "./services/cache-ttl.service";
import { RedisCacheService } from "./services/cache.redis.service";
import { LockService } from "./services/lock.service";
import { MetricsService } from "./services/metrics.service";
import { RateLimitService } from "./services/rate-limit.service";
import { RequestContextService } from "./services/request-context.service";
import { SchedulerService } from "./services/scheduler.service";

const providers = [
  AllExceptionsFilter,

  JwtAuthGuard,
  InternalAuthGuard,
  RolesGuard,
  RateLimitGuard,

  RequestIdMiddleware,
  RequestLoggerMiddleware,
  SecurityMiddleware,
  MaintenanceMiddleware,
  IpBlockMiddleware,
  UserAgentMiddleware,
  BodySizeMiddleware,
  RateLimitMiddleware,

  TimeoutInterceptor,
  RetryInterceptor,

  AppLoggerService,
  AuthJwtService,
  AuthSessionService,
  CacheTTLService,
  RedisCacheService,
  LockService,
  MetricsService,
  RateLimitService,
  RequestContextService,
  SchedulerService,
];

@Global()
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
  ],
  providers,
  exports: [
    DatabaseModule,
    ...providers,
  ],
})
export class SharedModule {}