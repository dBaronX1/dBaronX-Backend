import { Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import cookieParser from "cookie-parser";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./shared/filters/all-exceptions.filter";
import { JwtAuthGuard } from "./shared/guards/jwt-auth.guard";
import { PublicGuard } from "./shared/guards/public.guard";
import { RateLimitGuard } from "./shared/guards/rate-limit.guard";
import { RolesGuard } from "./shared/guards/roles.guard";
import { CacheInterceptor } from "./shared/interceptors/cache.interceptor";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";
import { RequestContextInterceptor } from "./shared/interceptors/request-context.interceptor";
import { ResponseTransformInterceptor } from "./shared/interceptors/response-transform.interceptor";
import { TimeoutInterceptor } from "./shared/interceptors/timeout.interceptor";
import { BodySizeMiddleware } from "./shared/middleware/body-size.middleware";
import { IpBlockMiddleware } from "./shared/middleware/ip-block.middleware";
import { MaintenanceMiddleware } from "./shared/middleware/maintenance.middleware";
import { RateLimitMiddleware } from "./shared/middleware/rate-limit.middleware";
import { RequestIdMiddleware } from "./shared/middleware/request-id.middleware";
import { RequestLoggerMiddleware } from "./shared/middleware/request-logger.middleware";
import { SecurityMiddleware } from "./shared/middleware/security.middleware";
import { UserAgentMiddleware } from "./shared/middleware/user-agent.middleware";

function csv(value: string | undefined, fallback: string): string[] {
  return (value ?? fallback)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatStartupError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const base: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    if (error.cause !== undefined) {
      base.cause = error.cause;
    }

    return base;
  }

  return {
    name: "NonErrorThrown",
    message: String(error),
    stack: undefined,
    cause: undefined,
  };
}

function logFatalStartupError(error: unknown): void {
  const payload = {
    event: "dbaronx_api_fatal_startup_error",
    ...formatStartupError(error),
    timestamp: new Date().toISOString(),
  };

  const logger = new Logger("dBaronXBootstrapFailure");
  logger.error(JSON.stringify(payload));
  console.error(JSON.stringify(payload));
}

function registerProcessLevelFatalHandlers(): void {
  process.on("unhandledRejection", (reason) => {
    logFatalStartupError(reason);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    logFatalStartupError(error);
    process.exit(1);
  });
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    bodyParser: true,
  });

  const logger = new Logger("dBaronXBootstrap");
  const configService = app.get(ConfigService);

  const host = process.env.HOST || "0.0.0.0";
  const port = Number(process.env.PORT || 3001);
  const apiPrefix = configService.get<string>("API_PREFIX") ?? "api";
  const corsOrigins = csv(
    configService.get<string>("CORS_ORIGINS") ?? process.env.CORS_ORIGINS,
    "http://localhost:3000",
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy:
        process.env.NODE_ENV === "production"
          ? undefined
          : false,
    }),
  );

  app.use(compression());
  app.use(cookieParser());

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "authorization",
      "content-type",
      "x-request-id",
      "x-internal-service-token",
      "x-idempotency-key",
      "x-telegram-init-data",
      "x-client-version",
    ],
    exposedHeaders: ["x-request-id"],
  });

  app.setGlobalPrefix(apiPrefix, {
    exclude: ["/", "/health"],
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const requestIdMiddleware = app.get(RequestIdMiddleware);
  const securityMiddleware = app.get(SecurityMiddleware);
  const maintenanceMiddleware = app.get(MaintenanceMiddleware);
  const ipBlockMiddleware = app.get(IpBlockMiddleware);
  const userAgentMiddleware = app.get(UserAgentMiddleware);
  const bodySizeMiddleware = app.get(BodySizeMiddleware);
  const rateLimitMiddleware = app.get(RateLimitMiddleware);
  const requestLoggerMiddleware = app.get(RequestLoggerMiddleware);

  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));
  app.use(securityMiddleware.use.bind(securityMiddleware));
  app.use(maintenanceMiddleware.use.bind(maintenanceMiddleware));
  app.use(ipBlockMiddleware.use.bind(ipBlockMiddleware));
  app.use(userAgentMiddleware.use.bind(userAgentMiddleware));
  app.use(bodySizeMiddleware.use.bind(bodySizeMiddleware));
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));
  app.use(requestLoggerMiddleware.use.bind(requestLoggerMiddleware));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      validationError: {
        target: false,
        value: false,
      },
    }),
  );

  app.useGlobalFilters(app.get(AllExceptionsFilter));

  app.useGlobalGuards(
    app.get(PublicGuard),
    app.get(JwtAuthGuard),
    app.get(RateLimitGuard),
    app.get(RolesGuard),
  );

  app.useGlobalInterceptors(
    app.get(RequestContextInterceptor),
    app.get(LoggingInterceptor),
    app.get(TimeoutInterceptor),
    app.get(CacheInterceptor),
    app.get(ResponseTransformInterceptor),
  );

  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_SWAGGER === "true") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("dBaronX API")
      .setDescription("dBaronX unified economic brain and API gateway")
      .setVersion("1.0.0")
      .addBearerAuth()
      .addApiKey(
        {
          type: "apiKey",
          name: "x-internal-service-token",
          in: "header",
        },
        "internal-service-token",
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  logger.log(`DBX API booting on ${host}/${port}`);
  await app.listen(port, host);
  logger.log(`DBX API listening on ${host}/${port}`);

  logger.log(
    JSON.stringify({
      event: "dbaronx_api_started",
      host,
      port,
      apiPrefix,
      corsOrigins,
      environment: process.env.NODE_ENV ?? "development",
      timestamp: new Date().toISOString(),
    }),
  );
}

registerProcessLevelFatalHandlers();

bootstrap().catch((error) => {
  logFatalStartupError(error);
  process.exit(1);
});
