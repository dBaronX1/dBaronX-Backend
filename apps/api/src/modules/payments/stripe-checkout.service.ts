import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import Stripe from "stripe";
import { EconomicEventService } from "../../shared/services/economic-event.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";

type StripeCheckoutMode = "test" | "live" | "unknown";
type SettlementStatus =
  | "unverified"
  | "ignored"
  | "already_processed"
  | "payment_verified_order_sync_pending"
  | "payment_verified_settlement_pending"
  | "payment_verified_ready_for_order_sync";

type StripeOrderSyncPreviewResult = {
  success: boolean;
  orderSyncReady: boolean;
  medusaCartReady: boolean;
  paymentRecordReady: boolean;
  canMapVerifiedStripeSession: boolean;
  mapping: Record<string, string | null>;
  blockers: string[];
};

type StripePaymentReadinessResult = {
  success: boolean;
  provider: "stripe";
  configured: boolean;
  safeMode: boolean;
  stripeEventIdempotencyReady: boolean;
  economicEventPersistenceReady: boolean;
  verifiedWebhookSettlementReady: boolean;
  orderSyncConfigured: boolean;
  blockers: string[];
};

type StripeWebhookResult = {
  received: boolean;
  verified: boolean;
  eventType: string | null;
  sessionId: string | null;
  paymentIntentId: string | null;
  amount: number | null;
  currency: string | null;
  metadata: Record<string, string | null>;
  paymentMarkedPaid: boolean;
  settlementHookReady: boolean;
  idempotencyKey: string | null;
  idempotencyRecorded: boolean;
  duplicate: boolean;
  economicEventReady: boolean;
  economicEventPersisted: boolean;
  orderSyncReady: boolean;
  settlementStatus: SettlementStatus;
  blockers: string[];
};

type StripeWebhookEventRecord = {
  eventId: string;
  eventType: string;
  sessionId: string | null;
  paymentIntentId: string | null;
  livemode: boolean;
  receivedAt: string;
};

interface StripeWebhookIdempotencyRecorder {
  readiness(): Promise<{ ready: boolean; blockers: string[] }>;
  record(event: StripeWebhookEventRecord): Promise<{ recorded: boolean; duplicate: boolean; blockers: string[] }>;
}

function isMissingPersistenceError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return ["42P01", "PGRST205", "PGRST106"].includes(code) || message.includes("stripe_webhook_events");
}

function isDuplicateError(error: { code?: string; message?: string } | null | undefined): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return code === "23505" || message.includes("duplicate key") || message.includes("unique");
}

@Injectable()
class SupabaseStripeWebhookIdempotencyRecorder implements StripeWebhookIdempotencyRecorder {
  private readonly logger = new Logger(SupabaseStripeWebhookIdempotencyRecorder.name);

  constructor(private readonly supabase: SupabaseService) {}

  async readiness(): Promise<{ ready: boolean; blockers: string[] }> {
    try {
      const { error } = await this.supabase
        .getClient()
        .schema("app_public")
        .from("stripe_webhook_events")
        .select("event_id")
        .limit(1);

      if (!error) return { ready: true, blockers: [] };
      if (isMissingPersistenceError(error)) return { ready: false, blockers: ["stripe_event_idempotency_store_not_configured"] };
      return { ready: false, blockers: ["stripe_event_idempotency_store_unhealthy"] };
    } catch {
      return { ready: false, blockers: ["stripe_event_idempotency_store_unhealthy"] };
    }
  }

  async record(event: StripeWebhookEventRecord): Promise<{ recorded: boolean; duplicate: boolean; blockers: string[] }> {
    try {
      const { error } = await this.supabase
        .getClient()
        .schema("app_public")
        .from("stripe_webhook_events")
        .insert({
          event_id: event.eventId,
          event_type: event.eventType,
          session_id: event.sessionId,
          payment_intent_id: event.paymentIntentId,
          livemode: event.livemode,
          received_at: event.receivedAt,
        });

      if (!error) return { recorded: true, duplicate: false, blockers: [] };
      if (isDuplicateError(error)) return { recorded: true, duplicate: true, blockers: [] };
      if (isMissingPersistenceError(error)) return { recorded: false, duplicate: false, blockers: ["stripe_event_idempotency_store_not_configured"] };

      this.logger.warn(`stripe_webhook_idempotency_record_failed code=${error.code || "unknown"} message=${error.message}`);
      return { recorded: false, duplicate: false, blockers: ["stripe_event_idempotency_store_unhealthy"] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`stripe_webhook_idempotency_record_exception ${message}`);
      return { recorded: false, duplicate: false, blockers: ["stripe_event_idempotency_store_unhealthy"] };
    }
  }
}

@Injectable()
export class StripeCheckoutService {
  private readonly logger = new Logger(StripeCheckoutService.name);
  private readonly idempotencyRecorder: StripeWebhookIdempotencyRecorder;

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly economicEvents: EconomicEventService,
  ) {
    this.idempotencyRecorder = new SupabaseStripeWebhookIdempotencyRecorder(this.supabase);
  }

  isConfigured(): boolean {
    return Boolean(this.getStripeSecretKey());
  }

  async readiness(): Promise<StripePaymentReadinessResult> {
    const blockers: string[] = [];
    const idempotency = await this.idempotencyRecorder.readiness();
    const economic = await this.checkEconomicEventPersistence();
    const configured = Boolean(this.getStripeSecretKey());
    const webhookSecret = Boolean(this.config.get<string>("STRIPE_WEBHOOK_SECRET"));
    const orderSyncConfigured = this.isOrderSyncConfigured();

    if (!configured) blockers.push("stripe_secret_key_missing");
    if (!webhookSecret) blockers.push("stripe_webhook_secret_missing");
    if (!idempotency.ready) blockers.push(...idempotency.blockers);
    if (!economic.ready) blockers.push(...economic.blockers);
    if (!orderSyncConfigured) blockers.push("order_sync_not_configured");
    if (!this.isLedgerPersistenceConfigured()) blockers.push("ledger_persistence_not_configured");

    return {
      success: blockers.length === 0,
      provider: "stripe",
      configured,
      safeMode: blockers.length > 0,
      stripeEventIdempotencyReady: idempotency.ready,
      economicEventPersistenceReady: economic.ready,
      verifiedWebhookSettlementReady: configured && webhookSecret && idempotency.ready && economic.ready,
      orderSyncConfigured,
      blockers: [...new Set(blockers)],
    };
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

      this.logger.log(`stripe_checkout_session_created mode=${mode} cart=${input.cartId} session=${session.id}`);

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
      const recorded = await this.recordVerifiedEvent(event, null, null);
      return {
        received: true,
        verified: true,
        eventType: event.type,
        sessionId: null,
        paymentIntentId: null,
        amount: null,
        currency: null,
        metadata: {},
        paymentMarkedPaid: false,
        settlementHookReady: true,
        idempotencyKey: event.id,
        idempotencyRecorded: recorded.recorded,
        duplicate: recorded.duplicate,
        economicEventReady: false,
        economicEventPersisted: false,
        orderSyncReady: false,
        settlementStatus: recorded.duplicate ? "already_processed" : "ignored",
        blockers: recorded.blockers,
      };
    }

    const session = event.data.object as Stripe.Checkout.Session;
    return this.prepareCheckoutSessionCompletedSettlement(event, session);
  }

  private async prepareCheckoutSessionCompletedSettlement(
    event: Stripe.Event,
    session: Stripe.Checkout.Session,
  ): Promise<StripeWebhookResult> {
    const paymentIntentId = this.getPaymentIntentId(session);
    const amount = session.amount_total ?? session.amount_subtotal ?? null;
    const currency = session.currency?.toLowerCase() || null;
    const metadata = this.extractSessionMetadata(session);

    this.logger.log(`stripe_checkout_session_completed_verified event=${event.id} session=${session.id} paymentIntent=${paymentIntentId ?? "none"}`);

    const recorded = await this.recordVerifiedEvent(event, session.id, paymentIntentId);

    if (recorded.duplicate) {
      return this.verifiedWebhookResult({
        event,
        session,
        paymentIntentId,
        amount,
        currency,
        metadata,
        idempotencyRecorded: recorded.recorded,
        duplicate: true,
        economicEventReady: true,
        economicEventPersisted: true,
        orderSyncReady: false,
        settlementStatus: "already_processed",
        blockers: [],
      });
    }

    const blockers = [...recorded.blockers];
    let economicEventReady = false;
    let economicEventPersisted = false;

    if (recorded.recorded && amount && currency) {
      const verifiedAt = event.created ? new Date(event.created * 1000).toISOString() : new Date().toISOString();
      const economic = await this.economicEvents.persist({
        eventType: "commerce.checkout.payment_verified",
        sourceModule: "commerce",
        paymentRail: "stripe",
        status: "verified",
        direction: "credit",
        amount,
        currency,
        referenceId: paymentIntentId || session.id,
        idempotencyKey: event.id,
        metadata: {
          verifierEvidence: {
            verifier: "stripe",
            reference: paymentIntentId || event.id,
            verifiedAt,
          },
          stripeEventId: event.id,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
          cartId: metadata.cartId,
          orderRef: metadata.orderRef,
          source: metadata.source,
        },
      });
      economicEventReady = economic.ready;
      economicEventPersisted = economic.persisted;
      blockers.push(...economic.blockers);
    } else if (!amount || !currency) {
      blockers.push("stripe_session_amount_or_currency_missing");
    }

    const orderSync = await this.evaluateOrderSyncReadiness(metadata, session.id);
    blockers.push(...orderSync.blockers);

    if (!this.isLedgerPersistenceConfigured()) blockers.push("ledger_persistence_not_configured");

    const uniqueBlockers = [...new Set(blockers)];
    const settlementStatus: SettlementStatus = orderSync.ready && economicEventReady && economicEventPersisted && uniqueBlockers.length === 0
      ? "payment_verified_ready_for_order_sync"
      : orderSync.ready
        ? "payment_verified_settlement_pending"
        : "payment_verified_order_sync_pending";

    return this.verifiedWebhookResult({
      event,
      session,
      paymentIntentId,
      amount,
      currency,
      metadata,
      idempotencyRecorded: recorded.recorded,
      duplicate: false,
      economicEventReady,
      economicEventPersisted,
      orderSyncReady: orderSync.ready,
      settlementStatus,
      blockers: uniqueBlockers,
    });
  }

  private verifiedWebhookResult(input: {
    event: Stripe.Event;
    session: Stripe.Checkout.Session;
    paymentIntentId: string | null;
    amount: number | null;
    currency: string | null;
    metadata: Record<string, string | null>;
    idempotencyRecorded: boolean;
    duplicate: boolean;
    economicEventReady: boolean;
    economicEventPersisted: boolean;
    orderSyncReady: boolean;
    settlementStatus: SettlementStatus;
    blockers: string[];
  }): StripeWebhookResult {
    return {
      received: true,
      verified: true,
      eventType: input.event.type,
      sessionId: input.session.id,
      paymentIntentId: input.paymentIntentId,
      amount: input.amount,
      currency: input.currency,
      metadata: input.metadata,
      paymentMarkedPaid: false,
      settlementHookReady: true,
      idempotencyKey: input.event.id,
      idempotencyRecorded: input.idempotencyRecorded,
      duplicate: input.duplicate,
      economicEventReady: input.economicEventReady,
      economicEventPersisted: input.economicEventPersisted,
      orderSyncReady: input.orderSyncReady,
      settlementStatus: input.settlementStatus,
      blockers: input.blockers,
    };
  }

  private async recordVerifiedEvent(
    event: Stripe.Event,
    sessionId: string | null,
    paymentIntentId: string | null,
  ): Promise<{ recorded: boolean; duplicate: boolean; blockers: string[] }> {
    return this.idempotencyRecorder.record({
      eventId: event.id,
      eventType: event.type,
      sessionId,
      paymentIntentId,
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
      paymentIntentId: null,
      amount: null,
      currency: null,
      metadata: {},
      paymentMarkedPaid: false,
      settlementHookReady: true,
      idempotencyKey: null,
      idempotencyRecorded: false,
      duplicate: false,
      economicEventReady: false,
      economicEventPersisted: false,
      orderSyncReady: false,
      settlementStatus: "unverified",
      blockers,
    };
  }

  private async checkEconomicEventPersistence(): Promise<{ ready: boolean; blockers: string[] }> {
    try {
      const { error } = await this.supabase
        .getClient()
        .schema("app_public")
        .from("economic_events")
        .select("id")
        .limit(1);
      if (!error) return { ready: true, blockers: [] };
      if (isMissingPersistenceError(error)) return { ready: false, blockers: ["economic_event_persistence_pending"] };
      return { ready: false, blockers: ["economic_event_persistence_unhealthy"] };
    } catch {
      return { ready: false, blockers: ["economic_event_persistence_unhealthy"] };
    }
  }

  private async evaluateOrderSyncReadiness(metadata: Record<string, string | null>, sessionId: string): Promise<{ ready: boolean; blockers: string[] }> {
    const blockers: string[] = [];
    const cartId = metadata.cartId;
    const orderRef = metadata.orderRef;

    if (!cartId) blockers.push("stripe_session_cart_id_missing");
    if (!orderRef) blockers.push("payment_verified_order_sync_pending");
    if (!this.isOrderSyncConfigured()) blockers.push("order_sync_not_configured");
    if (blockers.length > 0) return { ready: false, blockers };

    const baseUrl = this.getMedusaBaseUrl();
    const token = this.getMedusaAdminToken();

    try {
      const response = await axios.get(`${baseUrl}/admin/orders/${encodeURIComponent(orderRef || "")}`, {
        timeout: 10_000,
        headers: {
          authorization: `Bearer ${token}`,
          "x-caller-service": "dbaronx-api",
          "x-caller-surface": "stripe-webhook-order-sync-readiness",
          "x-stripe-session-id": sessionId,
        },
        validateStatus: () => true,
      });

      if (response.status === 404) return { ready: false, blockers: ["payment_verified_order_sync_pending"] };
      if (response.status >= 200 && response.status < 300 && response.data?.order) return { ready: true, blockers: [] };
      return { ready: false, blockers: ["payment_verified_order_sync_pending"] };
    } catch {
      return { ready: false, blockers: ["payment_verified_order_sync_pending"] };
    }
  }

  private extractSessionMetadata(session: Stripe.Checkout.Session): Record<string, string | null> {
    const metadata = session.metadata || {};
    return {
      cartId: metadata.cartId || null,
      orderRef: metadata.orderRef || metadata.checkoutRef || metadata.orderIntentId || null,
      source: metadata.source || null,
      checkoutRef: metadata.checkoutRef || null,
      customerRef: metadata.customerRef || null,
      userId: metadata.userId || null,
      productId: metadata.productId || null,
      variantId: metadata.variantId || null,
    };
  }

  private getPaymentIntentId(session: Stripe.Checkout.Session): string | null {
    if (!session.payment_intent) return null;
    return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent.id;
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

  private getMedusaBaseUrl(): string {
    return String(this.config.get<string>("MEDUSA_BASE_URL") || this.config.get<string>("MEDUSA_BACKEND_URL") || process.env.MEDUSA_BASE_URL || process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "");
  }

  private getMedusaAdminToken(): string {
    return String(this.config.get<string>("MEDUSA_ADMIN_API_KEY") || this.config.get<string>("MEDUSA_ADMIN_TOKEN") || process.env.MEDUSA_ADMIN_API_KEY || process.env.MEDUSA_ADMIN_TOKEN || "").trim();
  }

  private isOrderSyncConfigured(): boolean {
    return Boolean(this.getMedusaBaseUrl() && this.getMedusaAdminToken());
  }

  private isLedgerPersistenceConfigured(): boolean {
    return Boolean(this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY") || process.env.SUPABASE_SERVICE_ROLE_KEY);
  }

  private getStripeMode(secretKey: string): StripeCheckoutMode {
    if (secretKey.startsWith("sk_test_")) return "test";
    if (secretKey.startsWith("sk_live_")) return "live";
    return secretKey ? "unknown" : "test";
  }
}
