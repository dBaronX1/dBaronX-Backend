import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiStoryCampaignLifecycleController } from "./ai-story-campaign-lifecycle.controller";
import { AiStoryCampaignLifecycleService } from "./ai-story-campaign-lifecycle.service";
import { AiStoryCampaignOrchestrationService } from "./ai-story-campaign-orchestration.service";
import { AiStoryCampaignSchedulerController } from "./ai-story-campaign-scheduler.controller";
import { AiStoryCampaignSchedulerService } from "./ai-story-campaign-scheduler.service";
import { AiStoryCampaignsController } from "./ai-story-campaigns.controller";
import { AiStoryIntelligenceController } from "./ai-story-intelligence.controller";
import { AiStoryIntelligenceService } from "./ai-story-intelligence.service";
import { AiStoryOrchestrationController } from "./ai-story-orchestration.controller";
import { AiStoryPromotionOrchestratorService } from "./ai-story-promotion-orchestrator.service";
import { WalletModule } from "../wallet/wallet.module";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Module({
  imports: [ConfigModule, WalletModule],
  controllers: [
    AiStoryIntelligenceController,
    AiStoryOrchestrationController,
    AiStoryCampaignsController,
    AiStoryCampaignLifecycleController,
    AiStoryCampaignSchedulerController,
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
    AiStoryIntelligenceService,
    AiStoryPromotionOrchestratorService,
    AiStoryCampaignOrchestrationService,
    AiStoryCampaignLifecycleService,
    AiStoryCampaignSchedulerService,
  ],
  exports: [
    AiStoryIntelligenceService,
    AiStoryPromotionOrchestratorService,
    AiStoryCampaignOrchestrationService,
    AiStoryCampaignLifecycleService,
    AiStoryCampaignSchedulerService,
  ],
})
export class AiStoriesModule {}
