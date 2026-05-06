import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";
import { StripeCheckoutService } from "./stripe-checkout.service";

@ApiTags("stripe-checkout")
@Controller({ path: "checkout/stripe", version: "1" })
export class StripeCheckoutController {
  constructor(private readonly stripe: StripeCheckoutService) {}
  @Post("session") @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreateStripeCheckoutSessionDto) { return this.stripe.createSession(body); }
  @Post("webhook") @HttpCode(HttpStatus.OK)
  async webhook(@Req() req: Request, @Headers("stripe-signature") sig?: string) {
    const raw = JSON.stringify(req.body ?? {});
    const verified = this.stripe.verifyWebhook(raw, sig);
    return { received: true, verified, paymentMarkedPaid: false };
  }
}
