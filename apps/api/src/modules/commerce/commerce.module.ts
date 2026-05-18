import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CommerceBoundaryAuditController } from "./commerce-boundary-audit.controller";
import { CommerceBoundaryAuditService } from "./commerce-boundary-audit.service";
import { CommerceBoundaryController } from "./commerce-boundary.controller";
import { CommerceAdminController } from "./commerce-admin.controller";
import { CommerceAdminService } from "./commerce-admin.service";
import { CommerceCatalogSyncController } from "./commerce-catalog-sync.controller";
import { CommerceCatalogSyncService } from "./commerce-catalog-sync.service";
import { CommerceFulfillmentProviderNormalizationController } from "./commerce-fulfillment-provider-normalization.controller";
import { CommerceFulfillmentProviderNormalizationService } from "./commerce-fulfillment-provider-normalization.service";
import { CommerceFulfillmentSyncController } from "./commerce-fulfillment-sync.controller";
import { CommerceFulfillmentSyncService } from "./commerce-fulfillment-sync.service";
import { CommerceHealthController } from "./commerce-health.controller";
import { CommerceHealthService } from "./commerce-health.service";
import { CommerceOrderBridgeController } from "./commerce-order-bridge.controller";
import { CommerceOrderBridgeService } from "./commerce-order-bridge.service";
import { CommerceOrderSyncPreviewController } from "./commerce-order-sync-preview.controller";
import { CommerceOrderSyncPreviewService } from "./commerce-order-sync-preview.service";
import { CommerceProductSyncController } from "./commerce-product-sync.controller";
import { CommerceProductSyncService } from "./commerce-product-sync.service";
import { CommerceReconciliationController } from "./commerce-reconciliation.controller";
import { CommerceReconciliationService } from "./commerce-reconciliation.service";
import { CommerceSettlementBridgeController } from "./commerce-settlement-bridge.controller";
import { CommerceSettlementBridgeService } from "./commerce-settlement-bridge.service";
import { CommerceVariantSyncController } from "./commerce-variant-sync.controller";
import { CommerceVariantSyncService } from "./commerce-variant-sync.service";
import { StorefrontProductsController } from "./storefront-products.controller";
import { StorefrontProductsService } from "./storefront-products.service";
import { CrossServiceCompatibilityService } from "../../shared/services/cross-service-compatibility.service";
import { DecisionTracePersistenceBridgeService } from "../../shared/services/decision-trace-persistence-bridge.service";
import { FastapiIntelligenceConsumptionService } from "../../shared/services/fastapi-intelligence-consumption.service";
import { FastapiIntelligenceHttpService } from "../../shared/services/fastapi-intelligence-http.service";
import { FastapiRuntimeCompatibilityService } from "../../shared/services/fastapi-runtime-compatibility.service";
import { FastapiTraceExportService } from "../../shared/services/fastapi-trace-export.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { InternalRequestHeadersService } from "../../shared/services/internal-request-headers.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaBoundaryPolicyService } from "../../shared/services/medusa-boundary-policy.service";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { MedusaFulfillmentBridgeService } from "../../shared/services/medusa-fulfillment-bridge.service";
import { MedusaHttpService } from "../../shared/services/medusa-http.service";
import { MedusaVariantBridgeService } from "../../shared/services/medusa-variant-bridge.service";
import { RuntimeBlockersService } from "../../shared/services/runtime-blockers.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletModule } from "../wallet/wallet.module";

@Module({
  imports: [ConfigModule, WalletModule],
  controllers: [
    CommerceAdminController,
    CommerceHealthController,
    CommerceBoundaryController,
    CommerceBoundaryAuditController,
    CommerceOrderBridgeController,
    CommerceOrderSyncPreviewController,
    CommerceCatalogSyncController,
    CommerceProductSyncController,
    CommerceVariantSyncController,
    CommerceFulfillmentSyncController,
    CommerceFulfillmentProviderNormalizationController,
    CommerceSettlementBridgeController,
    CommerceReconciliationController,
    StorefrontProductsController,
  ],
  providers: [
    SupabaseService,
    InternalRequestHeadersService,
    RuntimeBlockersService,
    FastapiIntelligenceHttpService,
    FastapiIntelligenceConsumptionService,
    FastapiRuntimeCompatibilityService,
    CrossServiceCompatibilityService,
    FastapiTraceExportService,
    DecisionTracePersistenceBridgeService,
    IntelligenceAuditPipelineService,
    StorefrontProductsService,
    LaunchReadinessPersistenceService,
    MedusaHttpService,
    MedusaBridgeService,
    MedusaVariantBridgeService,
    MedusaFulfillmentBridgeService,
    MedusaBoundaryPolicyService,
    CommerceAdminService,
    CommerceBoundaryAuditService,
    CommerceHealthService,
    CommerceOrderBridgeService,
    CommerceOrderSyncPreviewService,
    CommerceCatalogSyncService,
    CommerceProductSyncService,
    CommerceVariantSyncService,
    CommerceFulfillmentSyncService,
    CommerceFulfillmentProviderNormalizationService,
    CommerceSettlementBridgeService,
    CommerceReconciliationService,
  ],
  exports: [
    MedusaHttpService,
    MedusaBridgeService,
    MedusaVariantBridgeService,
    MedusaFulfillmentBridgeService,
    MedusaBoundaryPolicyService,
    CommerceAdminService,
    CommerceBoundaryAuditService,
    CommerceHealthService,
    CommerceOrderBridgeService,
    CommerceOrderSyncPreviewService,
    CommerceCatalogSyncService,
    CommerceProductSyncService,
    CommerceVariantSyncService,
    CommerceFulfillmentSyncService,
    CommerceFulfillmentProviderNormalizationService,
    CommerceSettlementBridgeService,
    CommerceReconciliationService,
  ],
})
export class CommerceModule {}
