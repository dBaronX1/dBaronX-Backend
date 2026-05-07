import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";

@Injectable()
export class SupplierReadinessService {
  constructor(
    private readonly config: ConfigService,
    private readonly cjSupplierAdapter: CjSupplierAdapterService,
  ) {}

  async getReadiness() {
    const cjAccessTokenPresent = Boolean((this.config.get<string>("CJ_ACCESS_TOKEN") || "").trim());
    const cjApiBaseUrlPresent = Boolean((this.config.get<string>("CJ_API_BASE_URL") || "").trim());
    const aliexpressApproved = Boolean(
      (this.config.get<string>("ALIEXPRESS_APP_KEY") || "").trim() &&
      (this.config.get<string>("ALIEXPRESS_APP_SECRET") || "").trim() &&
      (this.config.get<string>("ALIEXPRESS_API_BASE_URL") || "").trim(),
    );

    const blockers: string[] = [];
    const warnings: string[] = [];

    if (!cjAccessTokenPresent || !cjApiBaseUrlPresent) {
      blockers.push("cj_credentials_missing");
    }

    const cjProbe = await this.cjSupplierAdapter.liveProbe();
    if (cjProbe.blocker) {
      blockers.push(cjProbe.blocker);
    }

    if (cjAccessTokenPresent && cjApiBaseUrlPresent && !cjProbe.cjLiveProbeAttempted) {
      blockers.push("cj_config_present_without_live_probe");
    }

    if (!aliexpressApproved) {
      warnings.push("aliexpress_disabled_until_official_approval");
    }

    const uniqueBlockers = [...new Set(blockers)];

    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      warnings,
      cjConfigured: cjAccessTokenPresent && cjApiBaseUrlPresent,
      cjAccessTokenPresent,
      cjApiBaseUrlPresent,
      cjLiveProbeAttempted: cjProbe.cjLiveProbeAttempted,
      cjLiveProbeOk: cjProbe.cjLiveProbeOk,
      cjLiveProbeStatusCode: cjProbe.cjLiveProbeStatusCode,
      cjLiveProbeErrorCode: cjProbe.cjLiveProbeErrorCode,
      cjLiveProbeErrorMessageSanitized: cjProbe.cjLiveProbeErrorMessageSanitized,
      cjLiveProbeEndpoint: cjProbe.endpoint,
      aliexpressEnabled: aliexpressApproved,
      supplierImportRequiresExplicitProduct: true,
      bulkCatalogImportEnabled: false,
    };
  }
}
