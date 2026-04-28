import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: false,
  });

  const configService = app.get(ConfigService);
  const frontendUrl =
    configService.get<string>('app.frontendUrl') || 'https://dbaronx.com';
  const port = configService.get<number>('app.port') ?? 3000;

  app.enableCors({
    origin: [
      frontendUrl,
      'https://dbaronx.com',
      'https://www.dbaronx.com',
      'http://localhost:3000',
      'http://localhost:5173',
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  });

  app.use((req: any, res: any, next: () => void) => {
    req.requestId = req.headers['x-request-id'] || randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    next();
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  await app.listen(Number(process.env.PORT || port || 3000), '0.0.0.0');
}

bootstrap();