import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "crypto";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";

@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);
  constructor(private readonly config: ConfigService) {}
  isConfigured() { return Boolean(this.config.get<string>("STRIPE_SECRET_KEY")); }
  async createSession(input: CreateStripeCheckoutSessionDto) {
    if (!this.isConfigured()) return { configured: false, message: "checkout not configured" };
    this.logger.log(`stripe_checkout_session_created cart=${input.cartId}`);
    return {
      configured: true,
      mode: "test",
      provider: "stripe",
      checkoutSessionPathReady: true,
      message: "Stripe session endpoint reachable in test mode. Live Stripe session creation requires Stripe SDK wiring.",
      metadata: {
        cartId: input.cartId,
        userId: input.userId ?? "anon",
        supplierRefs: (input.supplierRefs ?? []).join(","),
        orderIntentId: input.orderIntentId ?? "",
      },
    };
  }
  verifyWebhook(payload: string, sigHeader: string | undefined) {
    const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET") || "";
    if (!secret || !sigHeader) return false;
    const digest = createHmac("sha256", secret).update(payload).digest("hex");
    const incoming = Buffer.from(sigHeader.trim());
    const expected = Buffer.from(digest);
    return incoming.length === expected.length && timingSafeEqual(incoming, expected);
  }
}
