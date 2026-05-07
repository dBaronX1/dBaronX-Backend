import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type SupplierReadinessBlocker =
  | "cj_access_token_missing"
  | "cj_base_url_missing"
  | "cj_config_present_without_live_probe"
  | "aliexpress_credentials_missing";

export interface SupplierReadinessSnapshot {
  success: boolean;
  blockers: SupplierReadinessBlocker[];
  cjConfigured: boolean;
  cjTokenPresent: boolean;
  cjBaseUrlPresent: boolean;
  aliexpressConfigured: boolean;
  aliexpressAppKeyPresent: boolean;
  aliexpressAppSecretPresent: boolean;
  safeMode: boolean;
  timestamp: string;
}

@Injectable()
export class SupplierReadinessService {
  constructor(private readonly config: ConfigService) {}

  getReadiness(): SupplierReadinessSnapshot {
    const cjTokenPresent = this.hasValue("CJ_ACCESS_TOKEN");
    const cjBaseUrlPresent = this.hasValue("CJ_API_BASE_URL");
    const aliexpressAppKeyPresent = this.hasValue("ALIEXPRESS_APP_KEY");
    const aliexpressAppSecretPresent = this.hasValue("ALIEXPRESS_APP_SECRET");

    const blockers: SupplierReadinessBlocker[] = [];

    if (!cjTokenPresent) {
      blockers.push("cj_access_token_missing");
    }

    if (!cjBaseUrlPresent) {
      blockers.push("cj_base_url_missing");
    }

    if (cjTokenPresent && cjBaseUrlPresent) {
      blockers.push("cj_config_present_without_live_probe");
    }

    if (!aliexpressAppKeyPresent || !aliexpressAppSecretPresent) {
      blockers.push("aliexpress_credentials_missing");
    }

    const cjConfigured = cjTokenPresent && cjBaseUrlPresent;
    const aliexpressConfigured = aliexpressAppKeyPresent && aliexpressAppSecretPresent;

    return {
      success: blockers.length === 0,
      blockers,
      cjConfigured,
      cjTokenPresent,
      cjBaseUrlPresent,
      aliexpressConfigured,
      aliexpressAppKeyPresent,
      aliexpressAppSecretPresent,
      safeMode: true,
      timestamp: new Date().toISOString(),
    };
  }

  private hasValue(key: string): boolean {
    const value = this.config.get<string>(key) ?? process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  }
}
