import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { SharedModule } from "./shared/shared.module";
import { BootstrapModule } from "./shared/bootstrap/bootstrap.module";

import { PlatformModule } from "./modules/platform/platform.module";
import { SystemModule } from "./modules/system/system.module";
import { SystemFinalizationModule } from "./modules/system/system-finalization.module";
import { DbxPaymentModule } from "./modules/dbx-payments/dbx-payment.module";
import { DbxPaymentsModule } from "./modules/dbx-payments/dbx-payments.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
    }),
    SharedModule,
    BootstrapModule,
    PlatformModule,
    SystemModule,
    SystemFinalizationModule,
    DbxPaymentModule,
    DbxPaymentsModule,
  ],
})
export class AppModule {}
