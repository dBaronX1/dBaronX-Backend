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
import { CjProductImportController } from "./cj-import/cj-product-import.controller";
import { CjProductImportService } from "./cj-import/cj-product-import.service";
import { CjProductPublishService } from "./cj-import/cj-product-publish.service";
import { CjProductCategoryMapperService } from "./cj-import/cj-product-category-mapper.service";
import { CjProductValidationService } from "./cj-import/cj-product-validation.service";

@Module({
  imports: [ConfigModule, CommerceModule, WalletModule],
  controllers: [SuppliersController, SupplierLifecycleController, SupplierReadinessController, CjProductImportController],
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
    CjProductImportService,
    CjProductPublishService,
    CjProductCategoryMapperService,
    CjProductValidationService,
  ],
  exports: [
    SupplierAdminService,
    SupplierOrchestrationService,
    SupplierLifecycleService,
    SupplierReadinessService,
    CjSupplierAdapterService,
    CjProductImportService,
    CjProductPublishService,
    CjProductCategoryMapperService,
    CjProductValidationService,
  ],
})
export class SuppliersModule {}
