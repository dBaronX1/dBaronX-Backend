import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WatchIntelligenceController } from "./watch-intelligence.controller";
import { WatchIntelligenceService } from "./watch-intelligence.service";
import { WatchOrchestrationController } from "./watch-orchestration.controller";
import { WatchRewardOrchestratorService } from "./watch-reward-orchestrator.service";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Module({
  imports: [ConfigModule],
  controllers: [WatchIntelligenceController, WatchOrchestrationController],
  providers: [
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiDecisionOrchestratorService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    SupabaseService,
    WatchIntelligenceService,
    WatchRewardOrchestratorService,
  ],
  exports: [
    WatchIntelligenceService,
    WatchRewardOrchestratorService,
    FastapiDecisionOrchestratorService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
  ],
})
export class WatchModule {}
