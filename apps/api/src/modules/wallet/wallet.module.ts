import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WalletLedgerController } from "./wallet-ledger.controller";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletOrchestrationController } from "./wallet-orchestration.controller";
import { WalletOrchestrationService } from "./wallet-orchestration.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";

@Module({
  imports: [ConfigModule],
  controllers: [WalletLedgerController, WalletOrchestrationController],
  providers: [
    SupabaseService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    WalletLedgerService,
    WalletOrchestrationService,
  ],
  exports: [WalletLedgerService, WalletOrchestrationService],
})
export class WalletModule {}
