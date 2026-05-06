import { Body, Controller, Headers, HttpCode, HttpStatus, Post, Req } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../../shared/decorators/public.decorator";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";
import { StripeCheckoutService } from "./stripe-checkout.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags("stripe-checkout")
@Public()
@Controller({ path: "checkout/stripe", version: "1" })
export class StripeCheckoutController {
  constructor(private readonly stripe: StripeCheckoutService) {}

  @Post("session")
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreateStripeCheckoutSessionDto) {
    return this.stripe.createSession(body);
  }

  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  async webhook(
    @Req() req: RawBodyRequest,
    @Headers("stripe-signature") sig?: string,
  ) {
    const payload = req.rawBody || JSON.stringify(req.body ?? {});
    return this.stripe.handleWebhook(payload, sig);
  }
}
