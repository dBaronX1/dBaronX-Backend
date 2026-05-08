import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type PaymentReadinessResponse = {
  stripeConfigured: boolean;
  stripeWebhookConfigured: boolean;
  dbxPaymentAddressPresent: boolean;
  solanaRpcConfigured: boolean;
  dbxTokenMintPresent: boolean;
  fastapiVerifierConfigured: boolean;
  orderSyncConfigured: boolean;
  blockers: string[];
  safeMode: boolean;
  timestamp: string;
};

@Injectable()
export class PaymentReadinessService {
  constructor(private readonly config: ConfigService) {}

  getReadiness(): PaymentReadinessResponse {
    const stripeConfigured = this.has("STRIPE_SECRET_KEY");
    const stripeWebhookConfigured = this.has("STRIPE_WEBHOOK_SECRET");
    const dbxPaymentAddressPresent = this.hasAny("DBX_PAYMENT_ADDRESS", "DBX_TREASURY_WALLET", "DBX_TREASURY_ADDRESS");
    const solanaRpcConfigured = this.hasAny("SOLANA_RPC_URL", "DBX_SOLANA_RPC_URL");
    const dbxTokenMintPresent = this.hasAny("DBX_TOKEN_MINT", "DBX_MINT_ADDRESS");
    const fastapiVerifierConfigured = this.hasAny("FASTAPI_BASE_URL", "fastapi.baseUrl") &&
      this.hasAny("INTERNAL_SERVICE_TOKEN", "fastapi.internalServiceToken");
    const orderSyncConfigured = this.hasAny("MEDUSA_BASE_URL", "MEDUSA_BACKEND_URL") &&
      this.hasAny("MEDUSA_ADMIN_API_KEY", "MEDUSA_ADMIN_TOKEN");

    const blockers = [
      ...(stripeConfigured ? [] : ["stripe_secret_key_missing"]),
      ...(stripeWebhookConfigured ? [] : ["stripe_webhook_secret_missing"]),
      ...(dbxPaymentAddressPresent ? [] : ["dbx_payment_address_missing"]),
      ...(solanaRpcConfigured ? [] : ["solana_rpc_not_configured"]),
      ...(dbxTokenMintPresent ? [] : ["dbx_token_mint_missing"]),
      ...(fastapiVerifierConfigured ? [] : ["fastapi_verifier_not_configured"]),
      ...(orderSyncConfigured ? [] : ["order_sync_not_configured"]),
    ];

    return {
      stripeConfigured,
      stripeWebhookConfigured,
      dbxPaymentAddressPresent,
      solanaRpcConfigured,
      dbxTokenMintPresent,
      fastapiVerifierConfigured,
      orderSyncConfigured,
      blockers,
      safeMode: blockers.length > 0,
      timestamp: new Date().toISOString(),
    };
  }

  private hasAny(...keys: string[]): boolean {
    return keys.some((key) => this.has(key));
  }

  private has(key: string): boolean {
    return Boolean(String(this.config.get<string>(key) || "").trim());
  }
}
