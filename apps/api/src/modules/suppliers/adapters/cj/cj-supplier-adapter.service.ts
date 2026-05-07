import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  CjImportPreparedPayload,
  CjProductImportDto,
  CjProductImportReadinessDto,
  NormalizedCjSupplierMetadata,
} from "./dto/cj-supplier.dto";

@Injectable()
export class CjSupplierAdapterService {
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
      metadata: { mapper: "price-margin-v1" },
    };
  }

  canSendLiveOrder() {
    return this.config.get<string>("SUPPLIER_LIVE_MODE") === "true";
  }

  prepareImportReadiness(
    input: CjProductImportReadinessDto,
  ): CjImportPreparedPayload {
    const supplierProductId = input.cjProductId?.trim() ?? "";
    const supplierSku = input.cjSku?.trim() ?? "";
    const blockers: string[] = [];

    if (!supplierProductId) {
      blockers.push("cj_product_id_required");
    }

    if (!supplierSku) {
      blockers.push("cj_sku_required");
    }

    if (!this.hasCredential("CJ_ACCESS_TOKEN")) {
      blockers.push("cj_access_token_missing");
    }

    if (!this.hasCredential("CJ_API_BASE_URL")) {
      blockers.push("cj_base_url_missing");
    }

    const metadata =
      blockers.length === 0
        ? this.normalizeSupplierMetadata({
            ...input,
            cjProductId: supplierProductId,
            cjSku: supplierSku,
          })
        : null;

    return {
      supplierImportReady: blockers.length === 0,
      blockers,
      metadata,
      medusaProductMetadataPreview: metadata ? { ...metadata } : null,
    };
  }

  private normalizeSupplierMetadata(
    input: Required<
      Pick<CjProductImportReadinessDto, "cjProductId" | "cjSku">
    > &
      CjProductImportReadinessDto,
  ): NormalizedCjSupplierMetadata {
    return {
      supplier: "cj",
      supplierProductId: input.cjProductId,
      supplierSku: input.cjSku,
      costPrice: typeof input.costPrice === "number" ? input.costPrice : null,
      shippingCountries: Array.isArray(input.shippingCountries)
        ? input.shippingCountries.map((country) => country.trim()).filter(Boolean)
        : [],
      deliveryEstimate: input.deliveryEstimate?.trim() || null,
      sourceUrl: input.sourceUrl?.trim() || null,
    };
  }

  private hasCredential(key: string): boolean {
    const value = this.config.get<string>(key) ?? process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  }
}
