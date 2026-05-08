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
