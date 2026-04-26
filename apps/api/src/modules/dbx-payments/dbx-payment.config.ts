import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DbxPaymentConfig {
  constructor(private readonly config: ConfigService) {}

  get mintAddress(): string {
    return this.config.get<string>("DBX_MINT_ADDRESS") ||
      "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";
  }

  get decimals(): number {
    return Number(this.config.get<number>("DBX_DECIMALS") || 9);
  }

  get treasuryWallet(): string {
    const value = this.config.get<string>("DBX_TREASURY_WALLET") || "";
    if (!value) {
      throw new Error("DBX_TREASURY_WALLET is required");
    }
    return value;
  }

  get intentTtlMinutes(): number {
    return Number(this.config.get<number>("DBX_PAYMENT_INTENT_TTL_MINUTES") || 30);
  }

  get fastApiBaseUrl(): string {
    const value =
      this.config.get<string>("FASTAPI_BASE_URL") ||
      this.config.get<string>("fastapi.baseUrl") ||
      "";
    if (!value) {
      throw new Error("FASTAPI_BASE_URL is required");
    }
    return value.replace(/\/+$/, "");
  }

  get internalServiceToken(): string {
    const value =
      this.config.get<string>("INTERNAL_SERVICE_TOKEN") ||
      this.config.get<string>("fastapi.internalServiceToken") ||
      "";
    if (!value) {
      throw new Error("INTERNAL_SERVICE_TOKEN is required");
    }
    return value;
  }
}
