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
    if (!configured) {
      return { success: false, provider: "paystack", configured, blockers: ["paystack_secret_key_missing"], authorizationUrl: null, reference: null, message: "Paystack is not configured." };
    }
    try {
      const res = await fetch(`${this.baseUrl()}/transaction/initialize`, {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.customerEmail || "checkout@dbaronx.local",
          amount: input.amount,
          currency: (input.currency || "usd").toUpperCase(),
          callback_url: input.successUrl,
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
      const authUrl = data?.data?.authorization_url || null;
      const reference = data?.data?.reference || null;
      if (!res.ok || !authUrl) {
        this.logger.warn(`paystack_initialize_failed status=${res.status}`);
        return { success: false, provider: "paystack", configured, blockers: ["paystack_checkout_session_create_failed"], authorizationUrl: null, reference, message: "Unable to initialize Paystack checkout." };
      }
      return { success: true, provider: "paystack", configured, blockers: [], authorizationUrl: authUrl, authorization_url: authUrl, url: authUrl, reference };
    } catch (error) {
      this.logger.error(`paystack_initialize_exception ${(error as Error).message}`);
      return { success: false, provider: "paystack", configured, blockers: ["paystack_checkout_session_create_failed"], authorizationUrl: null, reference: null, message: "Unable to initialize Paystack checkout." };
    }
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
