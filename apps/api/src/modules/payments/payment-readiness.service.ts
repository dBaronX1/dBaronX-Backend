import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { StripeCheckoutService } from "./stripe-checkout.service";

type PaymentReadinessSnapshot = {
  success: boolean;
  ready: boolean;
  provider: "stripe";
  mode: "test" | "live" | "unknown";
  stripeConfigured: boolean;
  stripeWebhookConfigured: boolean;
  checkoutSessionPathReady: boolean;
  webhookSafetyPathReady: boolean;
  frontendRedirectCanMarkPaid: false;
  paidStateAuthority: "verified_stripe_webhook_only";
  blockers: string[];
  warnings: string[];
  requiredServerEnv: string[];
  requiredPublicEnv: string[];
  orderSyncReady: boolean;
  orderSyncBlockers: string[];
};

@Injectable()
export class PaymentReadinessService {
  constructor(
    private readonly config: ConfigService,
    private readonly stripeCheckout: StripeCheckoutService,
  ) {}

  snapshot(): PaymentReadinessSnapshot {
    const stripeConfigured = this.hasValue("STRIPE_SECRET_KEY");
    const stripeWebhookConfigured = this.hasValue("STRIPE_WEBHOOK_SECRET");
    const orderSyncReady = this.orderSyncConfigured();
    const orderSyncBlockers = orderSyncReady
      ? []
      : ["order_sync_not_configured", ...this.missingOrderSyncEnv()];
    const blockers = [
      ...(stripeConfigured ? [] : ["stripe_secret_key_missing"]),
      ...(stripeWebhookConfigured ? [] : ["stripe_webhook_secret_missing"]),
      ...orderSyncBlockers,
    ];

    return {
      success: blockers.length === 0,
      ready: blockers.length === 0,
      provider: "stripe",
      mode: this.stripeCheckout.mode(),
      stripeConfigured,
      stripeWebhookConfigured,
      checkoutSessionPathReady: true,
      webhookSafetyPathReady: true,
      frontendRedirectCanMarkPaid: false,
      paidStateAuthority: "verified_stripe_webhook_only",
      blockers,
      warnings: orderSyncReady ? [] : ["payment_verified_order_sync_pending"],
      requiredServerEnv: [
        "STRIPE_SECRET_KEY",
        "STRIPE_WEBHOOK_SECRET",
        "INTERNAL_SERVICE_TOKEN",
        "MEDUSA_BACKEND_URL",
        "MEDUSA_ADMIN_TOKEN",
        "SUPABASE_SERVICE_ROLE_KEY",
      ],
      requiredPublicEnv: [
        "NEXT_PUBLIC_STRIPE_PUBLIC_KEY",
        "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
        "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
      ],
      orderSyncReady,
      orderSyncBlockers,
    };
  }

  private orderSyncConfigured(): boolean {
    return this.hasValue("MEDUSA_BACKEND_URL") && this.hasValue("MEDUSA_ADMIN_TOKEN") && this.hasValue("SUPABASE_SERVICE_ROLE_KEY");
  }

  private missingOrderSyncEnv(): string[] {
    return ["MEDUSA_BACKEND_URL", "MEDUSA_ADMIN_TOKEN", "SUPABASE_SERVICE_ROLE_KEY"]
      .filter((key) => !this.hasValue(key))
      .map((key) => `${key.toLowerCase()}_missing`);
  }

  private hasValue(key: string): boolean {
    return Boolean((this.config.get<string>(key) || "").trim());
  }
}
