import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SharedModule } from "../../shared/shared.module";
import { DbxChainVerifierClient } from "./dbx-chain-verifier.client";
import { DbxMedusaCommerceAdapter } from "./dbx-medusa-commerce.adapter";
import { DbxPaymentConfig } from "./dbx-payment.config";
import { DbxPaymentController } from "./dbx-payment.controller";
import { DbxPaymentReferenceService } from "./dbx-payment-reference.service";
import { DbxPaymentRepository } from "./dbx-payment.repository";
import { DbxPaymentService } from "./dbx-payment.service";

@Module({
  imports: [ConfigModule, SharedModule],
  controllers: [DbxPaymentController],
  providers: [
    DbxPaymentConfig,
    DbxPaymentReferenceService,
    DbxPaymentRepository,
    DbxChainVerifierClient,
    DbxMedusaCommerceAdapter,
    DbxPaymentService,
  ],
  exports: [
    DbxPaymentConfig,
    DbxPaymentReferenceService,
    DbxPaymentRepository,
    DbxPaymentService,
  ],
})
export class DbxPaymentsModule {}
