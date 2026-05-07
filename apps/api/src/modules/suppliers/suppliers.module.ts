import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommerceModule } from "../commerce/commerce.module";
import { WalletModule } from "../wallet/wallet.module";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";
import { SupplierAdminService } from "./supplier-admin.service";
import { SupplierLifecycleController } from "./supplier-lifecycle.controller";
import { SupplierLifecycleService } from "./supplier-lifecycle.service";
import { SupplierOrchestrationService } from "./supplier-orchestration.service";
import { SupplierReadinessController } from "./supplier-readiness.controller";
import { SupplierReadinessService } from "./supplier-readiness.service";
import { SuppliersController } from "./suppliers.controller";

@Module({
  imports: [ConfigModule, CommerceModule, WalletModule],
  controllers: [SuppliersController, SupplierLifecycleController, SupplierReadinessController],
  providers: [
    SupabaseService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    LaunchReadinessPersistenceService,
    SupplierAdminService,
    SupplierReadinessService,
    SupplierOrchestrationService,
    SupplierLifecycleService,
    CjSupplierAdapterService,
  ],
  exports: [
    SupplierAdminService,
    SupplierOrchestrationService,
    SupplierLifecycleService,
    SupplierReadinessService,
    CjSupplierAdapterService,
  ],
})
export class SuppliersModule {}
