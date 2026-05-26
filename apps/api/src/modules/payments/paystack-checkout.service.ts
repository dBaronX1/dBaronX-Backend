import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";

@Injectable()
export class PaystackCheckoutService {
  private readonly logger = new Logger(PaystackCheckoutService.name);
  constructor(private readonly config: ConfigService) {}

  async createAuthorization(input: CreateCheckoutSessionDto) {
    const secret = this.value("PAYSTACK_SECRET_KEY");
    const configured = Boolean(secret);
    const quantity = input.quantity ?? 1;
    const unitPriceMinor =
      input.unitPriceMinor ??
      input.priceMinor ??
      input.unit_price ??
      (Number.isInteger(input.amount) && Number.isInteger(quantity) && quantity > 0
        ? Math.floor((input.amount as number) / quantity)
        : undefined);
    const amount =
      input.amount ??
      input.amountMinor ??
      (typeof unitPriceMinor === "number" ? unitPriceMinor * quantity : undefined);
    if (!configured) {
      return { success: false, provider: "paystack", configured, blockers: ["paystack_not_configured"], authorizationUrl: null, reference: null, message: "Paystack is not configured." };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || !Number.isInteger(unitPriceMinor) || (unitPriceMinor || 0) <= 0 || !Number.isInteger(amount) || (amount || 0) <= 0 || amount !== unitPriceMinor * quantity) {
      return { success: false, provider: "paystack", configured, blocker: "checkout_payload_invalid", blockers: ["checkout_payload_invalid"], authorizationUrl: null, reference: null, message: "Unable to initialize Paystack checkout." };
    }
    try {
      const res = await fetch(`${this.baseUrl()}/transaction/initialize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.customerEmail || "checkout@dbaronx.local",
          amount,
          currency: (input.currency || "usd").toUpperCase(),
          callback_url: this.paystackCallbackUrl(input.successUrl),
          metadata: {
            cartId: input.cartId,
            checkoutRef: input.checkoutRef || input.orderRef || randomUUID(),
            orderRef: input.orderRef || null,
            productId: input.productId || null,
            handle: input.handle || null,
            imageUrl: null,
            supplier: input.supplier || null,
            supplierProductId: input.supplierProductId || null,
            supplierSku: input.supplierSku || null,
            referralCode: input.referralCode || null,
            referredByCode: input.referredByCode || null,
          },
        }),
      });
      const data = (await res.json()) as any;
      const authUrl = this.pickHostedUrl(data);
      const reference = data?.data?.reference || null;
      if (!res.ok) {
        this.logger.warn(`paystack_initialize_failed status=${res.status}`);
        return { success: false, provider: "paystack", configured, blocker: "paystack_session_failed", blockers: ["paystack_session_failed"], authorizationUrl: null, reference, message: "Unable to initialize Paystack checkout." };
      }
      if (!authUrl) {
        return { success: false, provider: "paystack", configured, blocker: "paystack_authorization_url_missing", blockers: ["paystack_authorization_url_missing"], authorizationUrl: null, reference, message: "Paystack response did not include a hosted authorization URL." };
      }
      return {
        success: true, provider: "paystack", configured, blockers: [],
        authorizationUrl: authUrl, authorization_url: authUrl, url: authUrl, reference,
        data: { authorizationUrl: authUrl, authorization_url: authUrl, url: authUrl, reference },
      };
    } catch (error) {
      this.logger.error(`paystack_initialize_exception ${(error as Error).message}`);
      return { success: false, provider: "paystack", configured, blocker: "paystack_session_failed", blockers: ["paystack_session_failed"], authorizationUrl: null, reference: null, message: "Unable to initialize Paystack checkout." };
    }
  }

  async verifyTransaction(reference?: string) {
    const secret = this.value("PAYSTACK_SECRET_KEY");
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
    const expected = this.value("PAYSTACK_WEBHOOK_SECRET");
    if (!expected) return { success: false, accepted: false, blocker: "paystack_webhook_secret_missing" };
    if (!signature || signature !== expected) return { success: false, accepted: false, blocker: "paystack_webhook_signature_invalid" };
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
    return {
      paystackReady: Boolean(this.value("PAYSTACK_SECRET_KEY")),
      webhookReady: Boolean(this.value("PAYSTACK_WEBHOOK_SECRET")),
    };
  }

  private baseUrl() { return this.value("PAYSTACK_API_BASE_URL") || "https://api.paystack.co"; }
  private value(key: string) { return String(this.config.get<string>(key) || process.env[key] || "").trim(); }
}
