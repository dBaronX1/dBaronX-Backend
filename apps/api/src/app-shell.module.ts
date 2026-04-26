import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppModule } from "./app.module";
import { BootstrapModule } from "./shared/bootstrap/bootstrap.module";
import { RequestContextMiddleware } from "./shared/middleware/request-context.middleware";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    BootstrapModule,
    AppModule,
  ],
})
export class AppShellModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      path: "*",
      method: RequestMethod.ALL,
    });
  }
}