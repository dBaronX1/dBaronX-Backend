import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdsCampaignLifecycleController } from "./ads-campaign-lifecycle.controller";
import { AdsCampaignLifecycleService } from "./ads-campaign-lifecycle.service";
import { AdsCampaignOrchestrationService } from "./ads-campaign-orchestration.service";
import { AdsController } from "./ads.controller";
import { WalletModule } from "../wallet/wallet.module";
import { SupabaseService } from "../../shared/services/supabase.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";

@Module({
  imports: [ConfigModule, WalletModule],
  controllers: [AdsController, AdsCampaignLifecycleController],
  providers: [
    SupabaseService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    LaunchReadinessPersistenceService,
    AdsCampaignOrchestrationService,
    AdsCampaignLifecycleService,
  ],
  exports: [AdsCampaignOrchestrationService, AdsCampaignLifecycleService],
})
export class AdsModule {}
