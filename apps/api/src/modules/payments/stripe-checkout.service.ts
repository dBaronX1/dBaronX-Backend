import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import Stripe from "stripe";
import { EconomicEventService } from "../../shared/services/economic-event.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";
import {
  detectStripeSecretKeyMode,
  type StripeSecretKeyMode,
} from "./stripe-secret-key-mode";

type StripeCheckoutMode = "test" | "live" | "unknown";
type RequestedCheckoutMode = "test" | "live";
type SettlementStatus =
  | "unverified"
  | "ignored"
  | "already_processed"
  | "payment_verified_order_sync_pending"
  | "payment_verified_settlement_pending"
  | "payment_verified_ready_for_order_sync"
  | "medusa_order_completed";

type StripeOrderSyncPreviewResult = {
  success: boolean;
  orderSyncReady: boolean;
  medusaCartReady: boolean;
  paymentRecordReady: boolean;
  verifiedStripeEventReady: boolean;
  economicEventVerified: boolean;
  medusaOrderCompletionReady: boolean;
  medusaOrderId: string | null;
  settlementStatus: string | null;
  duplicateWebhookSafe: boolean;
  canMapVerifiedStripeSession: boolean;
  mapping: Record<string, string | null>;
  blockers: string[];
};

type StripeSettlementStatusLookupInput = {
  sessionId?: string | null;
  cartId?: string | null;
  orderRef?: string | null;
  checkoutRef?: string | null;
};

type StripeSettlementStatusResult = {
  success: boolean;
  blockers: string[];
  verifiedStripeEventReady: boolean;
  paymentRecordReady: boolean;
  economicEventVerified: boolean;
  medusaOrderCompletionReady: boolean;
  medusaOrderId: string | null;
  settlementStatus: string | null;
  paymentMarkedPaid: boolean;
  orderSyncReady: boolean;
  duplicateWebhookSafe: boolean;
};

type StripePaymentReadinessResult = {
  success: boolean;
  provider: "stripe";
  configured: boolean;
  safeMode: boolean;
  stripeSecretKeyMode: StripeSecretKeyMode;
  stripeWebhookConfigured: boolean;
  stripeWebhookUrlExpected: string;
  liveCheckoutExplicitlyAllowed: boolean;
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
  medusaOrderCompletionReady: boolean;
  medusaOrderId: string | null;
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
  cartId?: string | null;
  orderRef?: string | null;
  checkoutRef?: string | null;
  amountMinorUnits?: number | null;
  currency?: string | null;
  verificationStatus?: string;
  settlementStatus?: string;
  idempotencyKey?: string | null;
  rawMetadataSafe?: Record<string, string | null>;
};

interface StripeWebhookIdempotencyRecorder {
  readiness(): Promise<{ ready: boolean; blockers: string[] }>;
  record(
    event: StripeWebhookEventRecord,
  ): Promise<{ recorded: boolean; duplicate: boolean; blockers: string[] }>;
}

function isMissingPersistenceError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    ["42P01", "PGRST205", "PGRST106"].includes(code) ||
    message.includes("stripe_webhook_events")
  );
}

function isDuplicateError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  const code = String(error?.code || "");
  const message = String(error?.message || "").toLowerCase();
  return (
    code === "23505" ||
    message.includes("duplicate key") ||
    message.includes("unique")
  );
}

@Injectable()
class SupabaseStripeWebhookIdempotencyRecorder implements StripeWebhookIdempotencyRecorder {
  private readonly logger = new Logger(
    SupabaseStripeWebhookIdempotencyRecorder.name,
  );

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
      if (isMissingPersistenceError(error))
        return {
          ready: false,
          blockers: ["stripe_event_idempotency_store_not_configured"],
        };
      return {
        ready: false,
        blockers: ["stripe_event_idempotency_store_unhealthy"],
      };
    } catch {
      return {
        ready: false,
        blockers: ["stripe_event_idempotency_store_unhealthy"],
      };
    }
  }

  async record(
    event: StripeWebhookEventRecord,
  ): Promise<{ recorded: boolean; duplicate: boolean; blockers: string[] }> {
    try {
      const { error } = await this.supabase
        .getClient()
        .schema("app_public")
        .from("stripe_webhook_events")
        .insert({
          event_id: event.eventId,
          stripe_event_id: event.eventId,
          event_type: event.eventType,
          session_id: event.sessionId,
          stripe_session_id: event.sessionId,
          payment_intent_id: event.paymentIntentId,
          stripe_payment_intent_id: event.paymentIntentId,
          cart_id: event.cartId ?? null,
          order_ref: event.orderRef ?? null,
          checkout_ref: event.checkoutRef ?? null,
          amount_minor_units: event.amountMinorUnits ?? null,
          currency: event.currency ?? null,
          verification_status: event.verificationStatus || "verified",
          settlement_status:
            event.settlementStatus || "payment_verified_order_sync_pending",
          idempotency_key: event.idempotencyKey || event.eventId,
          raw_metadata_safe: event.rawMetadataSafe || {},
          livemode: event.livemode,
          received_at: event.receivedAt,
          updated_at: event.receivedAt,
        });

      if (!error) return { recorded: true, duplicate: false, blockers: [] };
      if (isDuplicateError(error))
        return { recorded: true, duplicate: true, blockers: [] };
      if (isMissingPersistenceError(error))
        return {
          recorded: false,
          duplicate: false,
          blockers: ["stripe_event_idempotency_store_not_configured"],
        };

      this.logger.warn(
        `stripe_webhook_idempotency_record_failed code=${error.code || "unknown"} message=${error.message}`,
      );
      return {
        recorded: false,
        duplicate: false,
        blockers: ["stripe_event_idempotency_store_unhealthy"],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `stripe_webhook_idempotency_record_exception ${message}`,
      );
      return {
        recorded: false,
        duplicate: false,
        blockers: ["stripe_event_idempotency_store_unhealthy"],
      };
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
    this.idempotencyRecorder = new SupabaseStripeWebhookIdempotencyRecorder(
      this.supabase,
    );
  }

  isConfigured(): boolean {
    return Boolean(this.getStripeSecretKey());
  }

  mode(): StripeCheckoutMode {
    const mode = this.getStripeSecretKeyMode(this.getStripeSecretKey());
    return mode === "missing" ? "unknown" : mode;
  }

  async readiness(): Promise<StripePaymentReadinessResult> {
    const stripeConfigured = this.isConfigured();
    const stripeSecretKeyMode = this.getStripeSecretKeyMode(
      this.getStripeSecretKey(),
    );
    const stripeWebhookConfigured = Boolean(
      String(this.config.get<string>("STRIPE_WEBHOOK_SECRET") || "").trim(),
    );
    const liveCheckoutExplicitlyAllowed = this.liveCheckoutExplicitlyAllowed();
    const stripeEventIdempotency = await this.idempotencyRecorder.readiness();
    const economicEventPersistence = await this.checkEconomicEventPersistence();
    const orderSyncConfigured = this.isOrderSyncConfigured();
    const blockers = [
      ...(stripeConfigured ? [] : ["stripe_secret_key_missing"]),
      ...(stripeSecretKeyMode === "live" && !liveCheckoutExplicitlyAllowed
        ? ["stripe_live_key_present_without_live_checkout_allowance"]
        : []),
      ...(stripeWebhookConfigured ? [] : ["stripe_webhook_secret_missing"]),
      ...stripeEventIdempotency.blockers,
      ...economicEventPersistence.blockers,
      ...(orderSyncConfigured ? [] : ["order_sync_not_configured"]),
    ];

    return {
      success: blockers.length === 0,
      provider: "stripe",
      configured: stripeConfigured,
      safeMode: blockers.length > 0,
      stripeSecretKeyMode,
      stripeWebhookConfigured,
      stripeWebhookUrlExpected: "/api/checkout/stripe/webhook",
      liveCheckoutExplicitlyAllowed,
      stripeEventIdempotencyReady: stripeEventIdempotency.ready,
      economicEventPersistenceReady: economicEventPersistence.ready,
      verifiedWebhookSettlementReady:
        stripeConfigured &&
        stripeWebhookConfigured &&
        stripeEventIdempotency.ready &&
        economicEventPersistence.ready,
      orderSyncConfigured,
      blockers: [...new Set(blockers)],
    };
  }

  async createSession(input: CreateStripeCheckoutSessionDto) {
    const secretKey = this.getStripeSecretKey();
    const blockers: string[] = [];
    const mode = this.getStripeSecretKeyMode(secretKey);
    const checkoutMode = this.getRequestedCheckoutMode(input.checkoutMode);
    const liveSmokeOverrideAllowed = this.isLiveSmokeOverrideAllowed();

    if (!secretKey) {
      blockers.push("stripe_secret_key_missing");
      return {
        success: false,
        configured: false,
        provider: "stripe",
        mode,
        stripeSecretKeyMode: mode,
        requestedCheckoutMode: checkoutMode,
        checkoutSessionPathReady: true,
        checkoutUrl: null,
        sessionId: null,
        blockers,
        message: "STRIPE_SECRET_KEY is not configured on the API server.",
      };
    }

    if (
      checkoutMode === "test" &&
      mode === "live" &&
      !liveSmokeOverrideAllowed
    ) {
      blockers.push("stripe_live_key_used_for_test_checkout");
      return {
        success: false,
        configured: true,
        provider: "stripe",
        mode,
        stripeSecretKeyMode: mode,
        requestedCheckoutMode: checkoutMode,
        checkoutSessionPathReady: true,
        checkoutUrl: null,
        sessionId: null,
        blockers,
        metadata: {
          stripeKeyMode: mode,
          stripeSecretKeyMode: mode,
          requestedCheckoutMode: checkoutMode,
        },
        message:
          "A live Stripe key is configured for a test checkout request. Configure Stripe test-mode secrets or explicitly allow live smoke checkout.",
      };
    }

    if (checkoutMode === "live" && !this.liveCheckoutExplicitlyAllowed()) {
      blockers.push("stripe_live_checkout_not_explicitly_allowed");
      return {
        success: false,
        configured: true,
        provider: "stripe",
        mode,
        stripeSecretKeyMode: mode,
        requestedCheckoutMode: checkoutMode,
        checkoutSessionPathReady: true,
        checkoutUrl: null,
        sessionId: null,
        blockers,
        metadata: {
          stripeKeyMode: mode,
          stripeSecretKeyMode: mode,
          requestedCheckoutMode: checkoutMode,
        },
        message:
          "Live Stripe checkout requires ALLOW_LIVE_STRIPE_CHECKOUT=true before a session can be created.",
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
                  name:
                    input.productName ||
                    `dBaronX checkout cart ${input.cartId}`,
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
          stripeSecretKeyMode: mode,
          requestedCheckoutMode: checkoutMode,
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
        stripeSecretKeyMode: mode,
        requestedCheckoutMode: checkoutMode,
        checkoutSessionPathReady: true,
        checkoutUrl: session.url,
        sessionId: session.id,
        blockers,
        metadata: {
          ...metadata,
          stripeKeyMode: mode,
          stripeSecretKeyMode: mode,
          requestedCheckoutMode: checkoutMode,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`stripe_checkout_session_create_failed ${message}`);
      return {
        success: false,
        configured: true,
        provider: "stripe",
        mode,
        stripeSecretKeyMode: mode,
        requestedCheckoutMode: checkoutMode,
        checkoutSessionPathReady: true,
        checkoutUrl: null,
        sessionId: null,
        blockers: ["stripe_checkout_session_create_failed"],
        message,
      };
    }
  }

  async previewOrderSync(
    input: CreateStripeCheckoutSessionDto & {
      sessionId?: string;
      paymentIntentId?: string;
    },
  ): Promise<StripeOrderSyncPreviewResult> {
    const mapping = {
      cartId: input.cartId || null,
      orderRef: input.orderRef || input.orderIntentId || null,
      checkoutRef:
        input.checkoutRef || input.orderRef || input.orderIntentId || null,
      customerRef:
        input.customerRef || input.customerEmail || input.userId || null,
      userId: input.userId || null,
      productId: input.productId || null,
      variantId: input.variantId || null,
      sessionId: input.sessionId || null,
      paymentIntentId: input.paymentIntentId || null,
    };

    const paymentRecord = await this.findVerifiedPaymentRecord(mapping);
    const economicEventVerified = paymentRecord.ready
      ? await this.findVerifiedEconomicEvent(
          paymentRecord.stripeEventId,
          mapping.sessionId,
          mapping.paymentIntentId,
        )
      : false;
    const medusaOrderId = paymentRecord.medusaOrderId;
    const medusaOrderCompletionReady = Boolean(
      medusaOrderId || paymentRecord.orderSyncStatus === "completed",
    );

    const blockers = [
      ...(mapping.cartId ? [] : ["cart_id_missing"]),
      ...(mapping.checkoutRef || mapping.orderRef
        ? []
        : ["checkout_ref_missing"]),
      ...(mapping.sessionId
        ? []
        : ["stripe_session_id_missing_until_checkout_created"]),
      ...(paymentRecord.ready ? [] : ["payment_record_lookup_pending"]),
      ...(medusaOrderCompletionReady
        ? []
        : ["medusa_order_completion_pending_verified_webhook"]),
    ];

    if (
      paymentRecord.ready &&
      !medusaOrderCompletionReady &&
      paymentRecord.orderSyncStatus === "requires_payment_provider_session"
    ) {
      blockers.push("medusa_cart_completion_requires_payment_provider_session");
    }

    return {
      success: true,
      orderSyncReady: blockers.length === 0,
      medusaCartReady: Boolean(mapping.cartId),
      paymentRecordReady: paymentRecord.ready,
      verifiedStripeEventReady: paymentRecord.ready,
      economicEventVerified,
      medusaOrderCompletionReady,
      medusaOrderId,
      settlementStatus: paymentRecord.settlementStatus,
      duplicateWebhookSafe: paymentRecord.ready,
      canMapVerifiedStripeSession: Boolean(
        mapping.cartId && (mapping.checkoutRef || mapping.orderRef),
      ),
      mapping,
      blockers: [...new Set(blockers)],
    };
  }

  async settlementStatus(
    input: StripeSettlementStatusLookupInput,
  ): Promise<StripeSettlementStatusResult> {
    const mapping = {
      sessionId: this.cleanLookupValue(input.sessionId),
      cartId: this.cleanLookupValue(input.cartId),
      orderRef: this.cleanLookupValue(input.orderRef),
      checkoutRef: this.cleanLookupValue(input.checkoutRef),
    };
    const blockers: string[] = [];

    if (
      !mapping.sessionId &&
      !(mapping.cartId && (mapping.orderRef || mapping.checkoutRef))
    ) {
      blockers.push("stripe_session_id_or_cart_order_ref_required");
    }

    const paymentRecord = blockers.length
      ? {
          ready: false,
          stripeEventId: null,
          settlementStatus: null,
          medusaOrderId: null,
          orderSyncStatus: null,
          amountMinorUnits: null,
          currency: null,
        }
      : await this.findVerifiedPaymentRecord(mapping);
    const economicEventVerified = paymentRecord.ready
      ? await this.findVerifiedEconomicEvent(
          paymentRecord.stripeEventId,
          mapping.sessionId,
          null,
        )
      : false;
    const idempotency = await this.idempotencyRecorder.readiness();

    const medusaOrderCompletionReady = Boolean(
      paymentRecord.medusaOrderId || paymentRecord.orderSyncStatus === "completed",
    );
    const paymentRecordReady = paymentRecord.ready;
    const verifiedStripeEventReady = paymentRecord.ready;
    const paymentMarkedPaid = Boolean(
      verifiedStripeEventReady &&
        paymentRecordReady &&
        paymentRecord.amountMinorUnits &&
        paymentRecord.currency,
    );
    const duplicateWebhookSafe = Boolean(paymentRecord.ready && idempotency.ready);

    blockers.push(...idempotency.blockers);
    if (!paymentRecordReady) blockers.push("payment_record_lookup_pending");
    if (!verifiedStripeEventReady) blockers.push("verified_stripe_event_missing");
    if (paymentRecordReady && !economicEventVerified)
      blockers.push("economic_event_verified_missing");
    if (paymentRecordReady && !medusaOrderCompletionReady) {
      blockers.push(
        paymentRecord.orderSyncStatus === "requires_payment_provider_session"
          ? "medusa_cart_completion_requires_payment_provider_session"
          : "medusa_order_completion_pending_verified_webhook",
      );
    }
    if (paymentRecordReady && !duplicateWebhookSafe)
      blockers.push("stripe_event_idempotency_store_not_configured");

    const uniqueBlockers = [...new Set(blockers)];
    return {
      success: uniqueBlockers.length === 0,
      blockers: uniqueBlockers,
      verifiedStripeEventReady,
      paymentRecordReady,
      economicEventVerified,
      medusaOrderCompletionReady,
      medusaOrderId: paymentRecord.medusaOrderId,
      settlementStatus: paymentRecord.settlementStatus,
      paymentMarkedPaid,
      orderSyncReady: medusaOrderCompletionReady,
      duplicateWebhookSafe,
    };
  }

  async handleWebhook(
    payload: Buffer | string,
    sigHeader: string | undefined,
  ): Promise<StripeWebhookResult> {
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
        paymentIntentId: null,
        amount: null,
        currency: null,
        metadata: {},
        paymentMarkedPaid: false,
        settlementHookReady: true,
        idempotencyKey: event.id,
        idempotencyRecorded: false,
        duplicate: false,
        economicEventReady: false,
        economicEventPersisted: false,
        orderSyncReady: false,
        medusaOrderCompletionReady: false,
        medusaOrderId: null,
        settlementStatus: "ignored",
        blockers: ["stripe_event_type_ignored"],
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

    this.logger.log(
      `stripe_checkout_session_completed_verified event=${event.id} session=${session.id} paymentIntent=${paymentIntentId ?? "none"}`,
    );

    const recorded = await this.recordVerifiedEvent(
      event,
      session.id,
      paymentIntentId,
      amount,
      currency,
      metadata,
    );

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
        medusaOrderCompletionReady: false,
        medusaOrderId: null,
        settlementStatus: "already_processed",
        blockers: [],
      });
    }

    const blockers = [...recorded.blockers];
    let economicEventReady = false;
    let economicEventPersisted = false;

    if (recorded.recorded && amount && currency) {
      const verifiedAt = event.created
        ? new Date(event.created * 1000).toISOString()
        : new Date().toISOString();
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
          checkoutRef: metadata.checkoutRef,
          source: metadata.source,
        },
      });
      economicEventReady = economic.ready;
      economicEventPersisted = economic.persisted;
      blockers.push(...economic.blockers);
    } else if (!amount || !currency) {
      blockers.push("stripe_session_amount_or_currency_missing");
    }

    const orderSync = await this.evaluateOrderSyncReadiness(
      metadata,
      session.id,
      event.id,
    );
    blockers.push(...orderSync.blockers);

    if (!this.isLedgerPersistenceConfigured())
      blockers.push("ledger_persistence_not_configured");

    const uniqueBlockers = [...new Set(blockers)];
    const settlementStatus: SettlementStatus =
      orderSync.ready && orderSync.medusaOrderCompletionReady
        ? "medusa_order_completed"
        : orderSync.ready &&
            economicEventReady &&
            economicEventPersisted &&
            uniqueBlockers.length === 0
          ? "payment_verified_ready_for_order_sync"
          : orderSync.ready
            ? "payment_verified_settlement_pending"
            : "payment_verified_order_sync_pending";

    await this.updateVerifiedEventSettlement(
      event.id,
      settlementStatus,
      orderSync.medusaOrderId,
      orderSync.medusaOrderCompletionReady
        ? "completed"
        : orderSync.orderSyncStatus,
    );

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
      medusaOrderCompletionReady: orderSync.medusaOrderCompletionReady,
      medusaOrderId: orderSync.medusaOrderId,
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
    medusaOrderCompletionReady: boolean;
    medusaOrderId: string | null;
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
      medusaOrderCompletionReady: input.medusaOrderCompletionReady,
      medusaOrderId: input.medusaOrderId,
      settlementStatus: input.settlementStatus,
      blockers: input.blockers,
    };
  }

  private async recordVerifiedEvent(
    event: Stripe.Event,
    sessionId: string | null,
    paymentIntentId: string | null,
    amountMinorUnits: number | null,
    currency: string | null,
    metadata: Record<string, string | null>,
  ): Promise<{ recorded: boolean; duplicate: boolean; blockers: string[] }> {
    return this.idempotencyRecorder.record({
      eventId: event.id,
      eventType: event.type,
      sessionId,
      paymentIntentId,
      cartId: metadata.cartId,
      orderRef: metadata.orderRef,
      checkoutRef: metadata.checkoutRef,
      amountMinorUnits,
      currency,
      verificationStatus: "verified",
      settlementStatus: "payment_verified_order_sync_pending",
      idempotencyKey: event.id,
      rawMetadataSafe: metadata,
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
      medusaOrderCompletionReady: false,
      medusaOrderId: null,
      settlementStatus: "unverified",
      blockers,
    };
  }

  private async checkEconomicEventPersistence(): Promise<{
    ready: boolean;
    blockers: string[];
  }> {
    try {
      const { error } = await this.supabase
        .getClient()
        .schema("app_public")
        .from("economic_events")
        .select("id")
        .limit(1);
      if (!error) return { ready: true, blockers: [] };
      if (isMissingPersistenceError(error))
        return {
          ready: false,
          blockers: ["economic_event_persistence_pending"],
        };
      return {
        ready: false,
        blockers: ["economic_event_persistence_unhealthy"],
      };
    } catch {
      return {
        ready: false,
        blockers: ["economic_event_persistence_unhealthy"],
      };
    }
  }

  private async evaluateOrderSyncReadiness(
    metadata: Record<string, string | null>,
    sessionId: string,
    stripeEventId: string,
  ): Promise<{
    ready: boolean;
    medusaOrderCompletionReady: boolean;
    medusaOrderId: string | null;
    orderSyncStatus: string;
    blockers: string[];
  }> {
    const blockers: string[] = [];
    const cartId = metadata.cartId;
    const orderRef = metadata.orderRef;

    if (!cartId) blockers.push("stripe_session_cart_id_missing");
    if (!orderRef) blockers.push("payment_verified_order_sync_pending");
    if (blockers.length > 0)
      return {
        ready: false,
        medusaOrderCompletionReady: false,
        medusaOrderId: null,
        orderSyncStatus: "blocked",
        blockers,
      };

    const completion = await this.completeMedusaCartAfterVerifiedPayment(
      cartId,
      sessionId,
      stripeEventId,
    );
    if (completion.ready) {
      return {
        ready: true,
        medusaOrderCompletionReady: true,
        medusaOrderId: completion.medusaOrderId,
        orderSyncStatus: "completed",
        blockers: [],
      };
    }

    return {
      ready: false,
      medusaOrderCompletionReady: false,
      medusaOrderId: null,
      orderSyncStatus: completion.orderSyncStatus,
      blockers: completion.blockers,
    };
  }

  private async completeMedusaCartAfterVerifiedPayment(
    cartId: string,
    sessionId: string,
    stripeEventId: string,
  ): Promise<{
    ready: boolean;
    medusaOrderId: string | null;
    orderSyncStatus: string;
    blockers: string[];
  }> {
    const baseUrl = this.getMedusaBaseUrl();
    const publishableKey = this.getMedusaPublishableKey();

    if (!baseUrl || !publishableKey) {
      return {
        ready: false,
        medusaOrderId: null,
        orderSyncStatus: "not_configured",
        blockers: ["order_sync_not_configured"],
      };
    }

    try {
      const response = await axios.post(
        `${baseUrl}/store/carts/${encodeURIComponent(cartId)}/complete`,
        {},
        {
          timeout: 15_000,
          headers: {
            "x-publishable-api-key": publishableKey,
            "idempotency-key":
              `stripe_verified_cart_complete_${stripeEventId}`.slice(0, 255),
            "x-caller-service": "dbaronx-api",
            "x-caller-surface": "stripe-webhook-medusa-cart-complete",
            "x-stripe-session-id": sessionId,
          },
          validateStatus: () => true,
        },
      );

      const order =
        response.data?.order || response.data?.type === "order"
          ? response.data?.order || response.data
          : null;
      const medusaOrderId =
        order?.id || response.data?.order_id || response.data?.id || null;
      if (response.status >= 200 && response.status < 300 && medusaOrderId) {
        return {
          ready: true,
          medusaOrderId: String(medusaOrderId),
          orderSyncStatus: "completed",
          blockers: [],
        };
      }

      const text = JSON.stringify(response.data || {}).toLowerCase();
      if (
        [400, 404, 409, 422].includes(response.status) &&
        /payment|provider|session|collection/.test(text)
      ) {
        return {
          ready: false,
          medusaOrderId: null,
          orderSyncStatus: "requires_payment_provider_session",
          blockers: [
            "medusa_cart_completion_requires_payment_provider_session",
          ],
        };
      }

      return {
        ready: false,
        medusaOrderId: null,
        orderSyncStatus: "pending",
        blockers: ["medusa_order_completion_pending_verified_webhook"],
      };
    } catch {
      return {
        ready: false,
        medusaOrderId: null,
        orderSyncStatus: "pending",
        blockers: ["medusa_order_completion_pending_verified_webhook"],
      };
    }
  }

  private async updateVerifiedEventSettlement(
    stripeEventId: string,
    settlementStatus: string,
    medusaOrderId: string | null,
    orderSyncStatus: string,
  ): Promise<void> {
    try {
      await this.supabase
        .getClient()
        .schema("app_public")
        .from("stripe_webhook_events")
        .update({
          settlement_status: settlementStatus,
          medusa_order_id: medusaOrderId,
          order_sync_status: orderSyncStatus,
          updated_at: new Date().toISOString(),
        })
        .or(`event_id.eq.${stripeEventId},stripe_event_id.eq.${stripeEventId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `stripe_verified_event_settlement_update_failed ${message}`,
      );
    }
  }

  private async findVerifiedPaymentRecord(
    mapping: Record<string, string | null>,
  ): Promise<{
    ready: boolean;
    stripeEventId: string | null;
    settlementStatus: string | null;
    medusaOrderId: string | null;
    orderSyncStatus: string | null;
    amountMinorUnits: number | null;
    currency: string | null;
  }> {
    try {
      let query = this.supabase
        .getClient()
        .schema("app_public")
        .from("stripe_webhook_events")
        .select(
          "event_id,stripe_event_id,settlement_status,medusa_order_id,order_sync_status,amount_minor_units,currency",
        )
        .eq("event_type", "checkout.session.completed")
        .eq("verification_status", "verified")
        .order("created_at", { ascending: false })
        .limit(1);

      if (mapping.sessionId)
        query = query.or(
          `session_id.eq.${mapping.sessionId},stripe_session_id.eq.${mapping.sessionId}`,
        );
      else if (mapping.cartId && mapping.orderRef)
        query = query
          .eq("cart_id", mapping.cartId)
          .eq("order_ref", mapping.orderRef);
      else if (mapping.cartId && mapping.checkoutRef)
        query = query
          .eq("cart_id", mapping.cartId)
          .eq("checkout_ref", mapping.checkoutRef);
      else
        return {
          ready: false,
          stripeEventId: null,
          settlementStatus: null,
          medusaOrderId: null,
          orderSyncStatus: null,
          amountMinorUnits: null,
          currency: null,
        };

      const { data, error } = await query.maybeSingle();
      if (error || !data)
        return {
          ready: false,
          stripeEventId: null,
          settlementStatus: null,
          medusaOrderId: null,
          orderSyncStatus: null,
          amountMinorUnits: null,
          currency: null,
        };
      const row = data as Record<string, string | null>;
      return {
        ready: true,
        stripeEventId: row.stripe_event_id || row.event_id || null,
        settlementStatus: row.settlement_status || null,
        medusaOrderId: row.medusa_order_id || null,
        orderSyncStatus: row.order_sync_status || null,
        amountMinorUnits: Number(row.amount_minor_units || 0) || null,
        currency: row.currency || null,
      };
    } catch {
      return {
        ready: false,
        stripeEventId: null,
        settlementStatus: null,
        medusaOrderId: null,
        orderSyncStatus: null,
        amountMinorUnits: null,
        currency: null,
      };
    }
  }

  private cleanLookupValue(value?: string | null): string | null {
    const cleaned = String(value || "").trim();
    return cleaned ? cleaned.slice(0, 500) : null;
  }

  private async findVerifiedEconomicEvent(
    stripeEventId: string | null,
    sessionId: string | null,
    paymentIntentId: string | null,
  ): Promise<boolean> {
    try {
      let query = this.supabase
        .getClient()
        .schema("app_public")
        .from("economic_events")
        .select("id")
        .eq("event_type", "commerce.checkout.payment_verified")
        .eq("status", "verified")
        .limit(1);
      if (stripeEventId) query = query.eq("idempotency_key", stripeEventId);
      else if (paymentIntentId)
        query = query.eq("reference_id", paymentIntentId);
      else if (sessionId) query = query.eq("reference_id", sessionId);
      else return false;
      const { data, error } = await query.maybeSingle();
      return !error && Boolean(data);
    } catch {
      return false;
    }
  }

  private extractSessionMetadata(
    session: Stripe.Checkout.Session,
  ): Record<string, string | null> {
    const metadata = session.metadata || {};
    return {
      cartId: metadata.cartId || null,
      orderRef:
        metadata.orderRef ||
        metadata.checkoutRef ||
        metadata.orderIntentId ||
        null,
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
    return typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent.id;
  }

  private buildMetadata(
    input: CreateStripeCheckoutSessionDto,
  ): Record<string, string> {
    return this.cleanMetadata({
      cartId: input.cartId,
      userId: input.userId || "",
      orderRef:
        input.orderRef || input.checkoutRef || input.orderIntentId || "",
      checkoutRef:
        input.checkoutRef ||
        input.orderRef ||
        input.orderIntentId ||
        input.cartId,
      customerRef:
        input.customerRef || input.customerEmail || input.userId || "",
      productId: input.productId || "",
      variantId: input.variantId || "",
      supplierRefs: (input.supplierRefs || []).join(","),
      orderIntentId: input.orderIntentId || "",
      source: "dbaronx",
      mode: input.checkoutMode || "test",
    });
  }

  private buildProductMetadata(
    input: CreateStripeCheckoutSessionDto,
  ): Record<string, string> {
    return this.cleanMetadata({
      cartId: input.cartId,
      orderRef:
        input.orderRef || input.checkoutRef || input.orderIntentId || "",
      checkoutRef:
        input.checkoutRef ||
        input.orderRef ||
        input.orderIntentId ||
        input.cartId,
      customerRef:
        input.customerRef || input.customerEmail || input.userId || "",
      productId: input.productId || "",
      variantId: input.variantId || "",
      orderIntentId: input.orderIntentId || "",
      source: "dbaronx",
      mode: input.checkoutMode || "test",
    });
  }

  private cleanMetadata(
    metadata: Record<string, string>,
  ): Record<string, string> {
    return Object.fromEntries(
      Object.entries(metadata)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) => [key, String(value).slice(0, 500)]),
    );
  }

  private createSessionIdempotencyKey(
    input: CreateStripeCheckoutSessionDto,
  ): string {
    const stableIntent = input.orderIntentId || input.orderRef || input.cartId;
    return `dbx_checkout_${stableIntent}_${input.amount}_${(input.currency || "usd").toLowerCase()}`.slice(
      0,
      255,
    );
  }

  private createClient(secretKey: string): Stripe {
    return new Stripe(secretKey, {
      apiVersion: "2025-09-30.clover",
    });
  }

  private getRequestedCheckoutMode(
    mode: CreateStripeCheckoutSessionDto["checkoutMode"],
  ): RequestedCheckoutMode {
    return mode === "live" ? "live" : "test";
  }

  private isLiveSmokeOverrideAllowed(): boolean {
    return (
      String(
        this.config.get<string>("ALLOW_LIVE_STRIPE_CHECKOUT_FOR_SMOKE") ||
          process.env.ALLOW_LIVE_STRIPE_CHECKOUT_FOR_SMOKE ||
          "",
      )
        .trim()
        .toLowerCase() === "true"
    );
  }

  private getStripeSecretKey(): string {
    return this.config.get<string>("STRIPE_SECRET_KEY") || "";
  }

  private getMedusaBaseUrl(): string {
    return String(
      this.config.get<string>("MEDUSA_BASE_URL") ||
        this.config.get<string>("MEDUSA_BACKEND_URL") ||
        process.env.MEDUSA_BASE_URL ||
        process.env.MEDUSA_BACKEND_URL ||
        "",
    ).replace(/\/$/, "");
  }

  private getMedusaAdminToken(): string {
    return String(
      this.config.get<string>("MEDUSA_ADMIN_API_KEY") ||
        this.config.get<string>("MEDUSA_ADMIN_TOKEN") ||
        process.env.MEDUSA_ADMIN_API_KEY ||
        process.env.MEDUSA_ADMIN_TOKEN ||
        "",
    ).trim();
  }

  private getMedusaPublishableKey(): string {
    return String(
      this.config.get<string>("MEDUSA_PUBLISHABLE_KEY") ||
        this.config.get<string>("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY") ||
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ||
        "",
    ).trim();
  }

  private isOrderSyncConfigured(): boolean {
    return Boolean(
      this.getMedusaBaseUrl() &&
      (this.getMedusaAdminToken() || this.getMedusaPublishableKey()),
    );
  }

  private isLedgerPersistenceConfigured(): boolean {
    return Boolean(
      this.config.get<string>("SUPABASE_SERVICE_ROLE_KEY") ||
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    );
  }

  private liveCheckoutExplicitlyAllowed(): boolean {
    return (
      String(
        this.config.get<string>("ALLOW_LIVE_STRIPE_CHECKOUT") ||
          process.env.ALLOW_LIVE_STRIPE_CHECKOUT ||
          "",
      )
        .trim()
        .toLowerCase() === "true"
    );
  }

  private getStripeSecretKeyMode(
    secretKey?: string | null,
  ): StripeSecretKeyMode {
    return detectStripeSecretKeyMode(secretKey);
  }
}
