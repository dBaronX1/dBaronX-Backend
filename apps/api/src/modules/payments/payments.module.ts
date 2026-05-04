import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CheckoutSettlementController } from "./checkout-settlement.controller";
import { CheckoutSettlementService } from "./checkout-settlement.service";
import { PaymentIntelligenceController } from "./payment-intelligence.controller";
import { PaymentIntelligenceService } from "./payment-intelligence.service";
import { PaymentOrchestrationController } from "./payment-orchestration.controller";
import { PaymentPreflightOrchestratorService } from "./payment-preflight-orchestrator.service";
import { WalletModule } from "../wallet/wallet.module";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { PaymentsAdminService } from "./payments-admin.service";
import { StripeCheckoutController } from "./stripe-checkout.controller";
import { StripeCheckoutService } from "./stripe-checkout.service";

@Module({
  imports: [ConfigModule, WalletModule],
  controllers: [
    PaymentIntelligenceController,
    PaymentOrchestrationController,
    CheckoutSettlementController,
    StripeCheckoutController,
  ],
  providers: [
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiDecisionOrchestratorService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    LaunchReadinessPersistenceService,
    SupabaseService,
    PaymentsAdminService,
    PaymentIntelligenceService,
    PaymentPreflightOrchestratorService,
    CheckoutSettlementService,
    StripeCheckoutService,
  ],
  exports: [
    PaymentIntelligenceService,
    PaymentsAdminService,
    PaymentPreflightOrchestratorService,
    CheckoutSettlementService,
    StripeCheckoutService,
  ],
})
export class PaymentsModule {}
