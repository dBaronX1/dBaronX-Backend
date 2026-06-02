import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, VERSION_NEUTRAL, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../../shared/decorators/public.decorator";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { PaystackCheckoutService } from "./paystack-checkout.service";
import { StripeCheckoutService } from "./stripe-checkout.service";
import { checkoutErrorResponse, mapCheckoutFailure } from "./checkout-error.mapper";

@Controller({ path: "checkout", version: VERSION_NEUTRAL })
export class CheckoutSessionController {
  constructor(
    private readonly stripe: StripeCheckoutService,
    private readonly paystack: PaystackCheckoutService,
  ) {}

  @Public()
  @Post("session")
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreateCheckoutSessionDto, @Res() response: Response) {
    const provider = body.paymentProvider || body.provider || body.paymentMethod || body.payment_method || body.selectedPaymentMethod || "stripe";
    if (provider === "paystack") {
      const res = await this.paystack.createAuthorization(body);
      if (!res.success) {
        const error = mapCheckoutFailure(res as Record<string, unknown>, "paystack");
        return response.status(error.status).json(checkoutErrorResponse(error));
      }
      return response.status(200).json({ success: true, provider: "paystack", checkoutUrl: res.authorizationUrl || res.checkoutUrl || null, reference: res.reference || null });
    }
    const res = await this.stripe.createSession(body);
    if (!res.success) {
      const error = mapCheckoutFailure(res as Record<string, unknown>, "stripe");
      return response.status(error.status).json(checkoutErrorResponse(error));
    }
    return response.status(200).json({ success: true, provider: "stripe", checkoutUrl: (res as any).checkoutUrl || null, checkoutSessionId: (res as any).sessionId || null, reference: (res as any).metadata?.checkoutRef || body.checkoutRef || body.orderRef || body.cartId || null });
  }

  @Public()
  @Get("readiness")
  async readiness() {
    const stripe = await this.stripe.readiness();
    const paystack = this.paystack.readiness();
    const stripeConfigured = Boolean(stripe.configured);
    const paystackConfigured = Boolean(paystack.paystackReady);
    const webhookConfigured = Boolean(stripe.stripeWebhookConfigured || paystack.webhookReady);
    const blockers = [
      ...(stripeConfigured || paystackConfigured ? [] : ["payment_provider_not_configured"]),
      ...(webhookConfigured ? [] : ["payment_webhook_not_configured"]),
    ];
    return { success: blockers.length === 0, stripeConfigured, paystackConfigured, multiLineCheckoutSupported: true, webhookConfigured, blockers };
  }



  @Public()
  @Post("stripe/session")
  @HttpCode(HttpStatus.OK)
  async createStripe(@Body() body: CreateCheckoutSessionDto, @Res() response: Response) {
    const res = await this.stripe.createSession(body as any);
    if (!res.success) {
      const error = mapCheckoutFailure(res as Record<string, unknown>, "stripe");
      return response.status(error.status).json(checkoutErrorResponse(error));
    }
    return response.status(200).json({ success: true, provider: "stripe", checkoutUrl: (res as any).checkoutUrl || null, checkoutSessionId: (res as any).sessionId || null, reference: (res as any).metadata?.checkoutRef || body.checkoutRef || body.orderRef || body.cartId || null });
  }

  @Public()
  @Post("paystack/session")
  @HttpCode(HttpStatus.OK)
  async createPaystack(@Body() body: CreateCheckoutSessionDto, @Res() response: Response) {
    const res = await this.paystack.createAuthorization(body);
    if (!res.success) {
      const error = mapCheckoutFailure(res as Record<string, unknown>, "paystack");
      return response.status(error.status).json(checkoutErrorResponse(error));
    }
    return response.status(200).json({ success: true, provider: "paystack", checkoutUrl: res.authorizationUrl || res.checkoutUrl || null, reference: res.reference || null });
  }

  @Public()
  @Get("paystack/verify")
  async verifyPaystack(@Query("reference") reference?: string) {
    return this.paystack.verifyTransaction(reference);
  }

  @Public()
  @Post("paystack/webhook")
  @HttpCode(HttpStatus.OK)
  async paystackWebhook(
    @Headers("x-paystack-signature") signature?: string,
    @Body() body?: unknown,
  ) {
    return this.paystack.handleWebhook(signature, body);
  }
}
