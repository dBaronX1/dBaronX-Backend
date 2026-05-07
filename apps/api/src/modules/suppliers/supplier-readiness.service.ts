import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CjSupplierAdapterService } from "./adapters/cj/cj-supplier-adapter.service";

export interface SupplierReadinessSnapshot {
  success: boolean;
  blockers: string[];
  cjConfigured: boolean;
  cjTokenPresent: boolean;
  cjBaseUrlPresent: boolean;
  cjLiveProbeAttempted: boolean;
  cjLiveProbeOk: boolean;
  cjLiveProbeStatusCode?: number;
  cjLiveProbeErrorCode?: string;
  cjLiveProbeErrorMessageSanitized?: string;
  aliexpressConfigured: boolean;
  aliexpressAppKeyPresent: boolean;
  aliexpressAppSecretPresent: boolean;
  safeMode: boolean;
  timestamp: string;
}

@Injectable()
export class SupplierReadinessService {
  constructor(
    private readonly config: ConfigService,
    private readonly cj: CjSupplierAdapterService,
  ) {}

  async snapshot(): Promise<SupplierReadinessSnapshot> {
    const cjTokenPresent = this.hasConfig("CJ_ACCESS_TOKEN");
    const cjBaseUrlPresent = this.hasConfig("CJ_API_BASE_URL");
    const aliexpressAppKeyPresent = this.hasConfig("ALIEXPRESS_APP_KEY");
    const aliexpressAppSecretPresent = this.hasConfig("ALIEXPRESS_APP_SECRET");

    const blockers: string[] = [];

    if (!cjTokenPresent) {
      blockers.push("cj_access_token_missing");
    }

    if (!cjBaseUrlPresent) {
      blockers.push("cj_base_url_missing");
    }

    const cjPreflight = await this.cj.readiness();
    blockers.push(...cjPreflight.blockers);

    if (!aliexpressAppKeyPresent || !aliexpressAppSecretPresent) {
      blockers.push("aliexpress_credentials_missing");
    }

    const uniqueBlockers = [...new Set(blockers)];

    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      cjConfigured: cjPreflight.cjConfigured,
      cjTokenPresent,
      cjBaseUrlPresent,
      cjLiveProbeAttempted: cjPreflight.cjLiveProbeAttempted,
      cjLiveProbeOk: cjPreflight.cjLiveProbeOk,
      ...(cjPreflight.cjLiveProbeStatusCode ? { cjLiveProbeStatusCode: cjPreflight.cjLiveProbeStatusCode } : {}),
      ...(cjPreflight.cjLiveProbeErrorCode ? { cjLiveProbeErrorCode: cjPreflight.cjLiveProbeErrorCode } : {}),
      ...(cjPreflight.cjLiveProbeErrorMessageSanitized
        ? { cjLiveProbeErrorMessageSanitized: cjPreflight.cjLiveProbeErrorMessageSanitized }
        : {}),
      aliexpressConfigured: aliexpressAppKeyPresent && aliexpressAppSecretPresent,
      aliexpressAppKeyPresent,
      aliexpressAppSecretPresent,
      safeMode: this.config.get<string>("SUPPLIER_LIVE_MODE") !== "true",
      timestamp: new Date().toISOString(),
    };
  }

  private hasConfig(key: string): boolean {
    return Boolean(this.config.get<string>(key)?.trim());
  }
}
