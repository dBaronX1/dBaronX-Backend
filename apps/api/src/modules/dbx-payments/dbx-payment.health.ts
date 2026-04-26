import { Injectable } from "@nestjs/common";
import { DbxPaymentConfig } from "./dbx-payment.config";
import { DbxPaymentFeatureRegistry } from "./dbx-payment-feature.registry";
import { DbxPaymentTreasuryService } from "./services/dbx-payment-treasury.service";

@Injectable()
export class DbxPaymentHealthService {
  constructor(
    private readonly config: DbxPaymentConfig,
    private readonly treasury: DbxPaymentTreasuryService,
    private readonly features: DbxPaymentFeatureRegistry,
  ) {}

  async health() {
    const checks = {
      mintConfigured: Boolean(this.config.mintAddress),
      treasuryConfigured: Boolean(this.config.treasuryWallet),
      fastApiConfigured: Boolean(this.config.fastApiBaseUrl),
      internalTokenConfigured: Boolean(this.config.internalServiceToken),
    };

    const ok = Object.values(checks).every(Boolean);

    return {
      ok,
      source: "dbx-payments",
      checks,
      token: this.treasury.tokenIdentity(),
      features: this.features.snapshot(),
      timestamp: new Date().toISOString(),
    };
  }
}