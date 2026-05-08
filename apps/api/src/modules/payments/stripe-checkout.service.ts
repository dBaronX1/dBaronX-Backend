import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";

type StripeCheckoutMode = "test" | "live" | "unknown";

type StripeOrderSyncPreviewResult = {
  success: boolean;
  orderSyncReady: boolean;
  medusaCartReady: boolean;
  paymentRecordReady: boolean;
  canMapVerifiedStripeSession: boolean;
  mapping: Record<string, string | null>;
  blockers: string[];
};

type StripeWebhookResult = {
  received: boolean;
  verified: boolean;
  eventType: string | null;
  sessionId: string | null;
  paymentMarkedPaid: boolean;
  settlementHookReady: boolean;
  idempotencyKey: string | null;
  idempotencyRecorded: boolean;
  blockers: string[];
};

type StripeWebhookEventRecord = {
  eventId: string;
  eventType: string;
  sessionId: string | null;
  livemode: boolean;
  receivedAt: string;
};

interface StripeWebhookIdempotencyRecorder {
  record(event: StripeWebhookEventRecord): Promise<{ recorded: boolean; duplicate: boolean }>;
}

@Injectable()
class LoggingStripeWebhookIdempotencyRecorder implements StripeWebhookIdempotencyRecorder {
  private readonly logger = new Logger(LoggingStripeWebhookIdempotencyRecorder.name);

  async record(event: StripeWebhookEventRecord): Promise<{ recorded: boolean; duplicate: boolean }> {
    this.logger.log(
      `stripe_webhook_idempotency_placeholder event=${event.eventId} type=${event.eventType} session=${event.sessionId ?? "none"}`,
    );

    return { recorded: false, duplicate: false };
  }
}

@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);
  private readonly idempotencyRecorder: StripeWebhookIdempotencyRecorder;

  constructor(private readonly config: ConfigService) {
    this.idempotencyRecorder = new LoggingStripeWebhookIdempotencyRecorder();
  }

  isConfigured(): boolean {
    return Boolean(this.getStripeSecretKey());
  }

  mode(): StripeCheckoutMode {
    return this.getStripeMode(this.getStripeSecretKey());
  }

  async createSession(input: CreateStripeCheckoutSessionDto) {
    const secretKey = this.getStripeSecretKey();
    const blockers: string[] = [];
    const mode = this.getStripeMode(secretKey);

    if (!secretKey) {
      blockers.push("stripe_secret_key_missing");
      return {
        success: false,
        configured: false,
        provider: "stripe",
        mode,
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
    const productMetadata = this.buildProductMetadata(input);

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
                  metadata: productMetadata,
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
          mode,
          checkoutSessionPathReady: true,
          checkoutUrl: null,
          sessionId: session.id || null,
          blockers,
          message: "Stripe created a session without a checkout URL.",
        };
      }

      this.logger.log(
        `stripe_checkout_session_created mode=${mode} cart=${input.cartId} session=${session.id}`,
      );

      return {
        success: true,
        configured: true,
        provider: "stripe",
        mode,
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
        mode,
        checkoutSessionPathReady: true,
        checkoutUrl: null,
        sessionId: null,
        blockers: ["stripe_checkout_session_create_failed"],
        message,
      };
    }
  }

  previewOrderSync(input: CreateStripeCheckoutSessionDto & { sessionId?: string; paymentIntentId?: string }): StripeOrderSyncPreviewResult {
    const mapping = {
      cartId: input.cartId || null,
      orderRef: input.orderRef || input.orderIntentId || null,
      checkoutRef: input.checkoutRef || input.orderRef || input.orderIntentId || null,
      customerRef: input.customerRef || input.customerEmail || input.userId || null,
      userId: input.userId || null,
      productId: input.productId || null,
      variantId: input.variantId || null,
      sessionId: input.sessionId || null,
      paymentIntentId: input.paymentIntentId || null,
    };
    const blockers = [
      ...(mapping.cartId ? [] : ["cart_id_missing"]),
      ...(mapping.checkoutRef || mapping.orderRef ? [] : ["checkout_ref_missing"]),
      ...(mapping.sessionId ? [] : ["stripe_session_id_missing_until_checkout_created"]),
      "payment_record_lookup_pending",
      "medusa_order_completion_pending_verified_webhook",
    ];

    return {
      success: true,
      orderSyncReady: blockers.length === 0,
      medusaCartReady: Boolean(mapping.cartId),
      paymentRecordReady: false,
      canMapVerifiedStripeSession: Boolean(mapping.cartId && (mapping.checkoutRef || mapping.orderRef)),
      mapping,
      blockers,
    };
  }

  async handleWebhook(payload: Buffer | string, sigHeader: string | undefined): Promise<StripeWebhookResult> {
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
      const recorded = await this.recordVerifiedEvent(event, null);
      return {
        received: true,
        verified: true,
        eventType: event.type,
        sessionId: null,
        paymentMarkedPaid: false,
        settlementHookReady: true,
        idempotencyKey: event.id,
        idempotencyRecorded: recorded.recorded,
        blockers: recorded.recorded ? [] : ["stripe_event_idempotency_storage_pending"],
      };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    return this.prepareCheckoutSessionCompletedSettlement(event, session);
  }

  private async prepareCheckoutSessionCompletedSettlement(
    event: Stripe.Event,
    session: Stripe.Checkout.Session,
  ): Promise<StripeWebhookResult> {
    this.logger.log(
      `stripe_checkout_session_completed_verified event=${event.id} session=${session.id}`,
    );

    const recorded = await this.recordVerifiedEvent(event, session.id);

    return {
      received: true,
      verified: true,
      eventType: event.type,
      sessionId: session.id,
      paymentMarkedPaid: false,
      settlementHookReady: true,
      idempotencyKey: event.id,
      idempotencyRecorded: recorded.recorded,
      blockers: [
        ...(recorded.recorded ? [] : ["stripe_event_idempotency_storage_pending"]),
        "settlement_pending",
      ],
    };
  }

  private async recordVerifiedEvent(
    event: Stripe.Event,
    sessionId: string | null,
  ): Promise<{ recorded: boolean; duplicate: boolean }> {
    return this.idempotencyRecorder.record({
      eventId: event.id,
      eventType: event.type,
      sessionId,
      livemode: event.livemode,
      receivedAt: new Date().toISOString(),
    });
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
      idempotencyRecorded: false,
      blockers,
    };
  }

  private buildMetadata(input: CreateStripeCheckoutSessionDto): Record<string, string> {
    return this.cleanMetadata({
      cartId: input.cartId,
      userId: input.userId || "",
      orderRef: input.orderRef || input.checkoutRef || input.orderIntentId || "",
      checkoutRef: input.checkoutRef || input.orderRef || input.orderIntentId || input.cartId,
      customerRef: input.customerRef || input.customerEmail || input.userId || "",
      productId: input.productId || "",
      variantId: input.variantId || "",
      supplierRefs: (input.supplierRefs || []).join(","),
      orderIntentId: input.orderIntentId || "",
      source: "dbaronx",
      mode: input.checkoutMode || "test",
    });
  }

  private buildProductMetadata(input: CreateStripeCheckoutSessionDto): Record<string, string> {
    return this.cleanMetadata({
      cartId: input.cartId,
      orderRef: input.orderRef || input.checkoutRef || input.orderIntentId || "",
      checkoutRef: input.checkoutRef || input.orderRef || input.orderIntentId || input.cartId,
      customerRef: input.customerRef || input.customerEmail || input.userId || "",
      productId: input.productId || "",
      variantId: input.variantId || "",
      orderIntentId: input.orderIntentId || "",
      source: "dbaronx",
      mode: input.checkoutMode || "test",
    });
  }

  private cleanMetadata(metadata: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value).slice(0, 500)]),
    );
  }

  private createSessionIdempotencyKey(input: CreateStripeCheckoutSessionDto): string {
    const stableIntent = input.orderIntentId || input.orderRef || input.cartId;
    return `dbx_checkout_${stableIntent}_${input.amount}_${(input.currency || "usd").toLowerCase()}`.slice(0, 255);
  }

  private createClient(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: "2025-09-30.clover",
    });
  }

  private getStripeSecretKey(): string {
    return this.config.get<string>("STRIPE_SECRET_KEY") || "";
  }

  private getStripeMode(secretKey: string): StripeCheckoutMode {
    if (secretKey.startsWith("sk_test_")) return "test";
    if (secretKey.startsWith("sk_live_")) return "live";
    return secretKey ? "unknown" : "test";
  }
}
