import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CjNormalizedSupplierMetadata,
  CjProductImportDto,
  CjProductImportReadinessDto,
} from "./dto/cj-supplier.dto";

export interface CjCredentialPreflightResult {
  success: boolean;
  blockers: string[];
  cjConfigured: boolean;
  cjTokenPresent: boolean;
  cjBaseUrlPresent: boolean;
  liveProbeAttempted: boolean;
  liveProbeVerified: boolean;
  timestamp: string;
}

export interface CjProductImportReadinessResult {
  success: boolean;
  blockers: string[];
  supplierImportReady: boolean;
  normalizedSupplierMetadata?: CjNormalizedSupplierMetadata;
  medusaMetadataSeed?: {
    supplier: "cj";
    supplierProductId: string;
    supplierSku: string;
    supplierMetadata: CjNormalizedSupplierMetadata;
  };
  timestamp: string;
}

@Injectable()
export class CjSupplierAdapterService {
  private readonly liveProbePath = "/v1/product/getCategory";

  constructor(private readonly config: ConfigService) {}

  mapImport(input: CjProductImportDto) {
    const supplierCost = 1000;
    const retailPrice = Math.round(supplierCost * (1 + input.marginPct / 100));
    return {
      supplier: "cj",
      supplierProductId: input.cjProductId,
      sku: input.targetSku,
      supplierCost,
      retailPrice,
      metadata: {
        mapper: "price-margin-v1",
        supplierDataMode: "DEMO_PLACEHOLDER",
        demo: true,
      },
    };
  }

  preflightCredentials(): CjCredentialPreflightResult {
    const cjTokenPresent = this.hasConfig("CJ_ACCESS_TOKEN");
    const cjBaseUrlPresent = this.hasConfig("CJ_API_BASE_URL");
    const blockers: string[] = [];

    if (!cjTokenPresent) {
      blockers.push("cj_access_token_missing");
    }

    if (!cjBaseUrlPresent) {
      blockers.push("cj_api_base_url_missing");
    }

    if (cjTokenPresent && cjBaseUrlPresent) {
      blockers.push("cj_config_present_without_live_probe");
    }

    const uniqueBlockers = [...new Set(blockers)];

    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      cjConfigured: cjTokenPresent && cjBaseUrlPresent,
      cjTokenPresent,
      cjBaseUrlPresent,
      liveProbeAttempted: false,
      liveProbeVerified: false,
      timestamp: new Date().toISOString(),
    };
  }

  prepareProductImport(input: CjProductImportReadinessDto): CjProductImportReadinessResult {
    const blockers = this.validateExplicitProductInput(input);
    const credentialPreflight = this.preflightCredentials();
    blockers.push(...credentialPreflight.blockers);

    const uniqueBlockers = [...new Set(blockers)];

    if (uniqueBlockers.length > 0) {
      return {
        success: false,
        blockers: uniqueBlockers,
        supplierImportReady: false,
        timestamp: new Date().toISOString(),
      };
    }

    const normalizedSupplierMetadata: CjNormalizedSupplierMetadata = {
      supplier: "cj",
      supplierProductId: input.supplierProductId.trim(),
      supplierSku: input.supplierSku.trim(),
      costPrice: input.costPrice,
      shippingCountries: input.shippingCountries.map((country) => country.trim().toUpperCase()),
      ...(input.deliveryEstimate?.trim() ? { deliveryEstimate: input.deliveryEstimate.trim() } : {}),
      ...(input.sourceUrl?.trim() ? { sourceUrl: input.sourceUrl.trim() } : {}),
    };

    return {
      success: true,
      blockers: [],
      supplierImportReady: true,
      normalizedSupplierMetadata,
      medusaMetadataSeed: {
        supplier: "cj",
        supplierProductId: normalizedSupplierMetadata.supplierProductId,
        supplierSku: normalizedSupplierMetadata.supplierSku,
        supplierMetadata: normalizedSupplierMetadata,
      },
      timestamp: new Date().toISOString(),
    };
  }

  canSendLiveOrder() {
    return this.config.get<string>("SUPPLIER_LIVE_MODE") === "true";
  }

  private validateExplicitProductInput(input: CjProductImportReadinessDto): string[] {
    const blockers: string[] = [];

    if (!input || typeof input !== "object") {
      throw new BadRequestException("CJ import readiness requires an explicit product payload");
    }

    if (!input.supplierProductId?.trim()) {
      blockers.push("cj_supplier_product_id_required");
    }

    if (!input.supplierSku?.trim()) {
      blockers.push("cj_supplier_sku_required");
    }

    if (!Number.isFinite(input.costPrice) || input.costPrice <= 0) {
      blockers.push("cj_cost_price_required");
    }

    if (!Array.isArray(input.shippingCountries) || input.shippingCountries.length === 0) {
      blockers.push("cj_shipping_countries_required");
    }

    return blockers;
  }

  private hasConfig(key: string): boolean {
    return Boolean(this.config.get<string>(key)?.trim());
  }
}
