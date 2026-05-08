import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DbxPaymentConfig {
  constructor(private readonly config: ConfigService) {}

  get mintAddress(): string {
    return this.config.get<string>("DBX_TOKEN_MINT") ||
      this.config.get<string>("DBX_MINT_ADDRESS") ||
      "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE";
  }

  get decimals(): number {
    return Number(this.config.get<number>("DBX_DECIMALS") || 9);
  }

  get treasuryWallet(): string {
    const value =
      this.config.get<string>("NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS") ||
      this.config.get<string>("DBX_TREASURY_WALLET") ||
      this.config.get<string>("DBX_PAYMENT_ADDRESS") ||
      "";
    if (!value) {
      throw new Error("NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS or DBX_TREASURY_WALLET is required");
    }
    return value.trim();
  }

  get solanaRpcUrl(): string {
    return String(
      this.config.get<string>("SOLANA_RPC_URL") ||
      this.config.get<string>("DBX_SOLANA_RPC_URL") ||
      "",
    ).trim();
  }

  get solanaRpcConfigured(): boolean {
    return this.solanaRpcUrl.length > 0;
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
