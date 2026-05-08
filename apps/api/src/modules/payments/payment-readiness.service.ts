import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { detectStripeSecretKeyMode, type StripeSecretKeyMode } from "./stripe-secret-key-mode";

type PaymentReadinessSnapshot = {
  stripeConfigured: boolean;
  stripeSecretKeyMode: StripeSecretKeyMode;
  stripeWebhookConfigured: boolean;
  stripeWebhookUrlExpected: string;
  liveCheckoutExplicitlyAllowed: boolean;
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

  snapshot(): PaymentReadinessSnapshot {
    const stripeSecretKey = this.value("STRIPE_SECRET_KEY");
    const stripeConfigured = Boolean(stripeSecretKey);
    const stripeSecretKeyMode = detectStripeSecretKeyMode(stripeSecretKey);
    const stripeWebhookConfigured = this.present("STRIPE_WEBHOOK_SECRET");
    const liveCheckoutExplicitlyAllowed = this.value("ALLOW_LIVE_STRIPE_CHECKOUT").toLowerCase() === "true";
    const dbxPaymentAddressPresent = this.anyPresent([
      "NEXT_PUBLIC_DBX_SOLANA_PAYMENT_ADDRESS",
      "DBX_PAYMENT_ADDRESS",
      "DBX_TREASURY_WALLET",
      "DBX_TREASURY_ADDRESS",
    ]);
    const solanaRpcConfigured = this.anyPresent([
      "SOLANA_RPC_URL",
      "DBX_SOLANA_RPC_URL",
    ]);
    const dbxTokenMintPresent = this.anyPresent([
      "DBX_TOKEN_MINT",
      "DBX_MINT_ADDRESS",
    ]);
    const fastapiVerifierConfigured = this.present("FASTAPI_BASE_URL") &&
      this.present("INTERNAL_SERVICE_TOKEN");
    const orderSyncConfigured = this.present("SUPABASE_SERVICE_ROLE_KEY") &&
      this.anyPresent(["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"]);

    const blockers = [
      ...(stripeConfigured ? [] : ["stripe_secret_key_missing"]),
      ...(stripeSecretKeyMode === "live" && !liveCheckoutExplicitlyAllowed ? ["stripe_live_key_present_without_live_checkout_allowance"] : []),
      ...(stripeWebhookConfigured ? [] : ["stripe_webhook_secret_missing"]),
      ...(dbxPaymentAddressPresent ? [] : ["dbx_payment_address_missing"]),
      ...(solanaRpcConfigured ? [] : ["solana_rpc_not_configured"]),
      ...(dbxTokenMintPresent ? [] : ["dbx_token_mint_missing"]),
      ...(fastapiVerifierConfigured ? [] : ["fastapi_verifier_not_configured"]),
      ...(orderSyncConfigured ? [] : ["order_sync_not_configured"]),
    ];

    return {
      stripeConfigured,
      stripeSecretKeyMode,
      stripeWebhookConfigured,
      stripeWebhookUrlExpected: "/api/checkout/stripe/webhook",
      liveCheckoutExplicitlyAllowed,
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

  private anyPresent(keys: string[]): boolean {
    return keys.some((key) => this.present(key));
  }

  private present(key: string): boolean {
    return Boolean(this.value(key));
  }

  private value(key: string): string {
    return String(this.config.get<string>(key) || process.env[key] || "").trim();
  }

}
