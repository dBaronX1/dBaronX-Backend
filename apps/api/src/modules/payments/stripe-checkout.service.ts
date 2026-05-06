import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";

type StripeWebhookResult = {
  received: boolean;
  verified: boolean;
  eventType: string | null;
  sessionId: string | null;
  paymentMarkedPaid: boolean;
  settlementHookReady: boolean;
  idempotencyKey: string | null;
  blockers: string[];
};

@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.getStripeSecretKey());
  }

  async createSession(input: CreateStripeCheckoutSessionDto) {
    const secretKey = this.getStripeSecretKey();
    const blockers: string[] = [];

    if (!secretKey) {
      blockers.push("stripe_secret_key_missing");
      return {
        success: false,
        configured: false,
        provider: "stripe",
        mode: "test",
        checkoutSessionPathReady: true,
        checkoutUrl: null,
        sessionId: null,
        blockers,
        message: "STRIPE_SECRET_KEY is not configured on the API server.",
      };
    }

    const stripe = this.createClient(secretKey);
    const currency = (input.currency || "usd").toLowerCase();
    const metadata = this.buildMetadata(input);

    try {
      const session = await stripe.checkout.sessions.create(
        {
          mode: "payment",
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          customer_email: input.customerEmail,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency,
                unit_amount: input.amount,
                product_data: {
                  name: input.productName || `dBaronX checkout cart ${input.cartId}`,
                  metadata: {
                    cartId: input.cartId,
                    orderIntentId: input.orderIntentId || "",
                  },
                },
              },
            },
          ],
          metadata,
          payment_intent_data: {
            metadata,
          },
        },
        {
          idempotencyKey: this.createSessionIdempotencyKey(input),
        },
      );

      if (!session.id || !session.url) {
        blockers.push("stripe_session_missing_url_or_id");
        return {
          success: false,
          configured: true,
          provider: "stripe",
          mode: "test",
          checkoutUrl: null,
          sessionId: session.id || null,
          blockers,
          message: "Stripe created a session without a checkout URL.",
        };
      }

      this.logger.log(
        `stripe_checkout_session_created cart=${input.cartId} session=${session.id}`,
      );

      return {
        success: true,
        configured: true,
        provider: "stripe",
        mode: "test",
        checkoutSessionPathReady: true,
        checkoutUrl: session.url,
        sessionId: session.id,
        blockers,
        metadata,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`stripe_checkout_session_create_failed ${message}`);
      return {
        success: false,
        configured: true,
        provider: "stripe",
        mode: "test",
        checkoutUrl: null,
        sessionId: null,
        blockers: ["stripe_checkout_session_create_failed"],
        message,
      };
    }
  }

  handleWebhook(payload: Buffer | string, sigHeader: string | undefined): StripeWebhookResult {
    const secret = this.config.get<string>("STRIPE_WEBHOOK_SECRET") || "";
    const blockers: string[] = [];

    if (!secret) blockers.push("stripe_webhook_secret_missing");
    if (!sigHeader) blockers.push("stripe_signature_missing");

    if (blockers.length > 0) {
      return this.unverifiedWebhookResult(blockers);
    }

    let event: Stripe.Event;
    try {
      event = Stripe.webhooks.constructEvent(payload, sigHeader, secret);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`stripe_webhook_verification_failed ${message}`);
      return this.unverifiedWebhookResult(["stripe_webhook_signature_invalid"]);
    }

    if (event.type !== "checkout.session.completed") {
      return {
        received: true,
        verified: true,
        eventType: event.type,
        sessionId: null,
        paymentMarkedPaid: false,
        settlementHookReady: true,
        idempotencyKey: event.id,
        blockers: [],
      };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    return this.prepareCheckoutSessionCompletedSettlement(event, session);
  }

  private prepareCheckoutSessionCompletedSettlement(
    event: Stripe.Event,
    session: Stripe.Checkout.Session,
  ): StripeWebhookResult {
    this.logger.log(
      `stripe_checkout_session_completed_verified event=${event.id} session=${session.id}`,
    );

    return {
      received: true,
      verified: true,
      eventType: event.type,
      sessionId: session.id,
      paymentMarkedPaid: false,
      settlementHookReady: true,
      idempotencyKey: event.id,
      blockers: [],
    };
  }

  private unverifiedWebhookResult(blockers: string[]): StripeWebhookResult {
    return {
      received: true,
      verified: false,
      eventType: null,
      sessionId: null,
      paymentMarkedPaid: false,
      settlementHookReady: true,
      idempotencyKey: null,
      blockers,
    };
  }

  private buildMetadata(input: CreateStripeCheckoutSessionDto): Record<string, string> {
    return {
      cartId: input.cartId,
      userId: input.userId || "anon",
      supplierRefs: (input.supplierRefs || []).join(","),
      orderIntentId: input.orderIntentId || "",
      source: "dbaronx_nestjs_checkout",
    };
  }

  private createSessionIdempotencyKey(input: CreateStripeCheckoutSessionDto): string {
    const stableIntent = input.orderIntentId || input.cartId;
    return `dbx_checkout_${stableIntent}_${input.amount}_${(input.currency || "usd").toLowerCase()}`;
  }

  private createClient(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: "2025-09-30.clover",
    });
  }

  private getStripeSecretKey(): string {
    return this.config.get<string>("STRIPE_SECRET_KEY") || "";
  }
}
