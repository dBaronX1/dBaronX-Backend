import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DbxPaymentConfig {
  constructor(private readonly config: ConfigService) {}

  get mintAddress(): string {
    const value = this.first("DBX_TOKEN_MINT", "DBX_MINT_ADDRESS");
    if (!value) {
      throw new Error("DBX_TOKEN_MINT is required");
    }
    return value;
  }

  get decimals(): number {
    return Number(this.config.get<number>("DBX_DECIMALS") || 9);
  }

  get treasuryWallet(): string {
    const value = this.first("DBX_PAYMENT_ADDRESS", "DBX_TREASURY_WALLET", "DBX_TREASURY_ADDRESS");
    if (!value) {
      throw new Error("DBX payment address is required");
    }
    return value;
  }

  get intentTtlMinutes(): number {
    return Number(this.config.get<number>("DBX_PAYMENT_INTENT_TTL_MINUTES") || 30);
  }

  get fastApiBaseUrl(): string {
    const value = this.first("FASTAPI_BASE_URL", "fastapi.baseUrl");
    if (!value) {
      throw new Error("FASTAPI_BASE_URL is required");
    }
    return value.replace(/\/+$/, "");
  }

  get internalServiceToken(): string {
    const value = this.first("INTERNAL_SERVICE_TOKEN", "fastapi.internalServiceToken");
    if (!value) {
      throw new Error("INTERNAL_SERVICE_TOKEN is required");
    }
    return value;
  }

  get solanaRpcUrl(): string {
    return this.first("DBX_SOLANA_RPC_URL", "SOLANA_RPC_URL");
  }

  get runtimeBlockers(): string[] {
    return [
      ...(this.first("DBX_PAYMENT_ADDRESS", "DBX_TREASURY_WALLET", "DBX_TREASURY_ADDRESS") ? [] : ["dbx_payment_address_missing"]),
      ...(this.solanaRpcUrl ? [] : ["solana_rpc_not_configured"]),
      ...(this.first("DBX_TOKEN_MINT", "DBX_MINT_ADDRESS") ? [] : ["dbx_token_mint_missing"]),
      ...(this.first("FASTAPI_BASE_URL", "fastapi.baseUrl") && this.first("INTERNAL_SERVICE_TOKEN", "fastapi.internalServiceToken") ? [] : ["fastapi_verifier_not_configured"]),
    ];
  }

  private first(...keys: string[]): string {
    for (const key of keys) {
      const value = String(this.config.get<string>(key) || "").trim();
      if (value) return value;
    }

    return "";
  }
}
