import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AffiliateIntelligenceController } from "./affiliate-intelligence.controller";
import { AffiliateIntelligenceService } from "./affiliate-intelligence.service";
import { AffiliateOrchestrationController } from "./affiliate-orchestration.controller";
import { AffiliatePayoutOrchestratorService } from "./affiliate-payout-orchestrator.service";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Module({
  imports: [ConfigModule],
  controllers: [
    AffiliateIntelligenceController,
    AffiliateOrchestrationController,
  ],
  providers: [
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiDecisionOrchestratorService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    SupabaseService,
    AffiliateIntelligenceService,
    AffiliatePayoutOrchestratorService,
  ],
  exports: [
    AffiliateIntelligenceService,
    AffiliatePayoutOrchestratorService,
    FastapiDecisionOrchestratorService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
  ],
})
export class AffiliateModule {}
