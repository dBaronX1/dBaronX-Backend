import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { resolvePaymentMode } from "./payment-mode-resolver";

@Injectable()
export class PaystackCheckoutService {
  private readonly logger = new Logger(PaystackCheckoutService.name);
  constructor(private readonly config: ConfigService) {}

  async createAuthorization(input: CreateCheckoutSessionDto) {
    const paymentMode = this.resolvePaystackPaymentMode();
    const secret = paymentMode.secretKey;
    const configured = paymentMode.configured;
    const candidateLineItems = input.lineItems || input.line_items || input.items || input.cartItems || [];
    const rawLineItems = Array.isArray(candidateLineItems) ? candidateLineItems : [];
    const toText = (value: unknown) => String(value ?? "").trim();
    const toPositiveInteger = (value: unknown, fallback = 0) => {
      const numeric = typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);
      return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
    };
    const toPriceMinor = (value: unknown, fallback = 0) => {
      const raw = String(value ?? "").trim();
      const numeric = typeof value === "number" ? value : Number.parseFloat(raw);
      if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
      return raw.includes(".") ? Math.round(numeric * 100) : Math.floor(numeric);
    };
    const lineItems = rawLineItems.length > 0
      ? rawLineItems.map((item) => ({
          productId: toText(item.productId ?? item.product_id ?? item.id) || null,
          variantId: toText(item.variantId ?? item.variant_id ?? item.variant),
          handle: toText(item.handle ?? item.productHandle ?? item.product_handle) || null,
          title: toText(item.title ?? item.productName ?? item.product_name ?? item.name ?? item.handle) || "dBaronX checkout item",
          quantity: toPositiveInteger(item.quantity ?? item.qty),
          unitPriceMinor: toPositiveInteger(item.unitPriceMinor ?? item.priceMinor ?? item.unit_price ?? item.amountMinor) || toPriceMinor(item.price),
          currency: toText(item.currencyCode ?? item.currency ?? input.currency ?? "usd").toUpperCase(),
        }))
      : [{
          productId: toText(input.productId ?? input.product_id) || null,
          variantId: toText(input.variantId ?? input.variant_id),
          handle: toText(input.handle ?? input.product_handle) || null,
          title: toText(input.title ?? input.productName ?? input.product_name) || "dBaronX checkout item",
          quantity: toPositiveInteger(input.quantity, 1),
          unitPriceMinor: toPositiveInteger(input.unitPriceMinor ?? input.priceMinor ?? input.unit_price) || (Number.isInteger(input.amount) && Number.isInteger(input.quantity ?? 1) && (input.quantity ?? 1) > 0 ? Math.floor((input.amount as number) / (input.quantity ?? 1)) : 0),
          currency: toText(input.currency || "usd").toUpperCase(),
        }];
    const amount = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPriceMinor, 0);
    const requestedTotalRaw = input.totalMinor ?? input.amount ?? input.amountMinor;
    const requestedTotal = requestedTotalRaw === undefined ? undefined : toPriceMinor(requestedTotalRaw);
    const customer = input.customer || {};
    const shipping = input.shippingAddress || input.shipping || input.shipping_address || {};
    const customerEmail = toText(input.customerEmail ?? input.email ?? customer.email).toLowerCase();
    const addressLine1 = toText(input.addressLine1 ?? input.address1 ?? shipping.addressLine1 ?? shipping.address1);
    const country = toText(input.country ?? shipping.country);
    const city = toText(input.city ?? shipping.city);
    const postalCode = toText(input.postalCode ?? input.zip ?? input.postcode ?? shipping.postalCode ?? shipping.zip ?? shipping.postcode);

    if (!configured) {
      return { success: false, provider: "paystack", configured, mode: paymentMode.mode, blockers: paymentMode.blockers.length ? paymentMode.blockers : ["paystack_not_configured"], authorizationUrl: null, reference: null, message: "Payment provider is temporarily unavailable. Please try again." };
    }
    if (!customerEmail || !country || !city || !addressLine1 || !postalCode || lineItems.length === 0 || lineItems.some((item) => !item.variantId || !Number.isInteger(item.quantity) || item.quantity < 1 || !Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor <= 0) || (requestedTotal !== undefined && requestedTotal !== amount)) {
      return { success: false, provider: "paystack", configured, blocker: "checkout_payload_invalid", blockers: ["checkout_payload_invalid"], authorizationUrl: null, reference: null, message: "Some cart items are unavailable. Please update your cart and try again." };
    }
    try {
      const reference = input.checkoutRef || input.checkout_ref || input.orderRef || randomUUID();
      const res = await fetch(`${this.baseUrl()}/transaction/initialize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customerEmail,
          amount,
          currency: lineItems[0]?.currency || "USD",
          callback_url: this.paystackCallbackUrl(input.successUrl),
          metadata: {
            cartId: input.cartId || input.cart_id || null,
            checkoutRef: reference,
            orderRef: input.orderRef || null,
            lineItemCount: lineItems.length,
            lineItems: lineItems.map((item) => ({ productId: item.productId, variantId: item.variantId, handle: item.handle, quantity: item.quantity, unitPriceMinor: item.unitPriceMinor })),
            referralCode: input.referralCode || null,
            referredByCode: input.referredByCode || null,
          },
        }),
      });
      const data = (await res.json()) as any;
      const authUrl = this.pickHostedUrl(data);
      const providerReference = data?.data?.reference || reference;
      if (!res.ok) {
        this.logger.warn(`paystack_initialize_failed status=${res.status}`);
        return { success: false, provider: "paystack", configured, blocker: "paystack_session_failed", blockers: ["paystack_session_failed"], authorizationUrl: null, reference: providerReference, message: "Payment provider is temporarily unavailable. Please try again." };
      }
      if (!authUrl) {
        return { success: false, provider: "paystack", configured, blocker: "paystack_authorization_url_missing", blockers: ["paystack_authorization_url_missing"], authorizationUrl: null, reference: providerReference, message: "Payment provider is temporarily unavailable. Please try again." };
      }
      return {
        success: true, provider: "paystack", configured, blockers: [],
        authorizationUrl: authUrl, authorization_url: authUrl, url: authUrl, checkoutUrl: authUrl, reference: providerReference,
        data: { authorizationUrl: authUrl, authorization_url: authUrl, url: authUrl, checkoutUrl: authUrl, reference: providerReference },
      };
    } catch (error) {
      this.logger.error(`paystack_initialize_exception ${(error as Error).message}`);
      return { success: false, provider: "paystack", configured, blocker: "paystack_session_failed", blockers: ["paystack_session_failed"], authorizationUrl: null, reference: null, message: "Payment provider is temporarily unavailable. Please try again." };
    }
  }

  async verifyTransaction(reference?: string) {
    const secret = this.paystackSecretKey();
    if (!secret) return { success: false, verified: false, blocker: "paystack_not_configured" };
    if (!reference) return { success: false, verified: false, blocker: "paystack_reference_missing" };
    try {
      const res = await fetch(`${this.baseUrl()}/transaction/verify/${encodeURIComponent(reference)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
      });
      const data = (await res.json()) as any;
      const status = String(data?.data?.status || "").toLowerCase();
      return { success: res.ok, verified: res.ok && status === "success", reference, status: status || "unknown" };
    } catch {
      return { success: false, verified: false, blocker: "paystack_verify_failed" };
    }
  }

  async handleWebhook(signature?: string, payload?: unknown) {
    const signingSecret = this.paystackWebhookSigningSecret();
    if (!signingSecret) return { success: false, accepted: false, blocker: "paystack_webhook_secret_missing" };
    if (!signature || !this.isValidPaystackSignature(signature, payload, signingSecret)) {
      return { success: false, accepted: false, blocker: "paystack_webhook_signature_invalid" };
    }
    return { success: true, accepted: true, verified: true, event: (payload as any)?.event || "unknown" };
  }

  private paystackCallbackUrl(inputSuccessUrl?: string) {
    const canonical = "https://dbaronx.com/payment/success?provider=paystack";
    return this.value("PAYSTACK_CALLBACK_URL") || canonical || inputSuccessUrl || canonical;
  }
  private pickHostedUrl(data: any) {
    return data?.data?.authorization_url || data?.data?.authorizationUrl || data?.data?.url || data?.authorization_url || data?.authorizationUrl || data?.url || null;
  }

  readiness() {
    const paymentMode = this.resolvePaystackPaymentMode();
    return {
      provider: "paystack",
      configured: paymentMode.configured,
      paystackReady: paymentMode.configured,
      mode: paymentMode.mode,
      paystackMode: paymentMode.mode,
      blockers: paymentMode.blockers,
      authorizationUrl: null,
      reference: null,
      message: paymentMode.configured ? null : "Payment provider is temporarily unavailable. Please try again.",
      webhookReady: Boolean(this.paystackWebhookSigningSecret()),
      webhookSecretSource: this.value("PAYSTACK_WEBHOOK_SECRET") ? "PAYSTACK_WEBHOOK_SECRET" : paymentMode.secretKeySource,
    };
  }

  private resolvePaystackPaymentMode() {
    return resolvePaymentMode("paystack", (key) => this.config.get<string>(key) || process.env[key]);
  }

  private paystackWebhookSigningSecret() { return this.value("PAYSTACK_WEBHOOK_SECRET") || this.paystackSecretKey(); }
  private paystackSecretKey() { return this.resolvePaystackPaymentMode().secretKey; }

  private isValidPaystackSignature(signature: string, payload: unknown, signingSecret: string): boolean {
    const normalizedSignature = signature.trim().toLowerCase();
    const serializedPayload = typeof payload === "string" || Buffer.isBuffer(payload) ? payload : JSON.stringify(payload || {});
    const expected = createHmac("sha512", signingSecret).update(serializedPayload).digest("hex");
    const left = Buffer.from(normalizedSignature, "hex");
    const right = Buffer.from(expected, "hex");
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private baseUrl() { return this.value("PAYSTACK_API_BASE_URL") || "https://api.paystack.co"; }
  private value(key: string) { return String(this.config.get<string>(key) || process.env[key] || "").trim(); }
}
