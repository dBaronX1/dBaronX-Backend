import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SupplierLifecycleController } from "./supplier-lifecycle.controller";
import { SupplierLifecycleService } from "./supplier-lifecycle.service";
import { SupplierOrchestrationService } from "./supplier-orchestration.service";
import { SuppliersController } from "./suppliers.controller";
import { CommerceModule } from "../commerce/commerce.module";
import { WalletModule } from "../wallet/wallet.module";
import { SupabaseService } from "../../shared/services/supabase.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";

@Module({
  imports: [ConfigModule, CommerceModule, WalletModule],
  controllers: [SuppliersController, SupplierLifecycleController],
  providers: [
    SupabaseService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    LaunchReadinessPersistenceService,
    SupplierOrchestrationService,
    SupplierLifecycleService,
  ],
  exports: [SupplierOrchestrationService, SupplierLifecycleService],
})
export class SuppliersModule {}
