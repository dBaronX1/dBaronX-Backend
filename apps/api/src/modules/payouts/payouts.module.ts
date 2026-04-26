import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PayoutsController } from "./payouts.controller";
import { PayoutsService } from "./payouts.service";
import { PayoutLifecycleService } from "./payout-lifecycle.service";
import { AffiliateModule } from "../affiliate/affiliate.module";
import { WalletModule } from "../wallet/wallet.module";
import { SupabaseService } from "../../shared/services/supabase.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";

@Module({
  imports: [ConfigModule, AffiliateModule, WalletModule],
  controllers: [PayoutsController],
  providers: [
    SupabaseService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    PayoutsService,
    PayoutLifecycleService,
  ],
  exports: [PayoutsService, PayoutLifecycleService],
})
export class PayoutsModule {}
