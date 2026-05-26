import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, VERSION_NEUTRAL } from "@nestjs/common";
import { Public } from "../../shared/decorators/public.decorator";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";
import { PaystackCheckoutService } from "./paystack-checkout.service";
import { StripeCheckoutService } from "./stripe-checkout.service";

@Controller({ path: "checkout", version: VERSION_NEUTRAL })
export class CheckoutSessionController {
  constructor(
    private readonly stripe: StripeCheckoutService,
    private readonly paystack: PaystackCheckoutService,
  ) {}

  @Public()
  @Post("session")
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreateCheckoutSessionDto) {
    if (body.paymentProvider === "paystack") {
      const res = await this.paystack.createAuthorization(body);
      return { success: res.success, provider: "paystack", checkoutUrl: res.authorizationUrl || null, authorizationUrl: res.authorizationUrl || null, authorization_url: res.authorization_url || null, url: res.url || null, blockers: res.blockers || [], message: res.message || null, reference: res.reference || null, data: res.data || null };
    }
    const res = await this.stripe.createSession(body);
    return { ...res, url: (res as any).checkoutUrl || null };
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
