import { Body, Controller, HttpCode, HttpStatus, Post, VERSION_NEUTRAL } from "@nestjs/common";
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
      return { success: res.success, provider: "paystack", checkoutUrl: res.authorizationUrl || null, authorizationUrl: res.authorizationUrl || null, url: res.url || null, blockers: res.blockers || [], message: res.message || null, reference: res.reference || null };
    }
    const res = await this.stripe.createSession(body);
    return { ...res, url: (res as any).checkoutUrl || null };
  }
}
