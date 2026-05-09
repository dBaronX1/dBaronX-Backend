import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query, Req, SetMetadata, UseGuards, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../../shared/decorators/public.decorator";
import { InternalAuthGuard, INTERNAL_AUTH_REQUIRED_KEY } from "../../shared/guards/internal-auth.guard";
import { CreateStripeCheckoutSessionDto } from "./dto/create-stripe-checkout-session.dto";
import { StripeCheckoutService } from "./stripe-checkout.service";

type RawBodyRequest = Request & { rawBody?: Buffer };

@ApiTags("stripe-checkout")
@Controller({ path: "checkout/stripe", version: VERSION_NEUTRAL })
export class StripeCheckoutController {
  constructor(private readonly stripe: StripeCheckoutService) {}

  @Get("readiness")
  async readiness() {
    return this.stripe.readiness();
  }

  @Public()
  @Get("settlement-status")
  async settlementStatus(
    @Query("sessionId") sessionId?: string,
    @Query("stripeEventId") stripeEventId?: string,
    @Query("paymentIntentId") paymentIntentId?: string,
    @Query("chargeId") chargeId?: string,
    @Query("cartId") cartId?: string,
    @Query("orderRef") orderRef?: string,
    @Query("checkoutRef") checkoutRef?: string,
  ) {
    return this.stripe.settlementStatus({
      sessionId,
      stripeEventId,
      paymentIntentId,
      chargeId,
      cartId,
      orderRef,
      checkoutRef,
    });
  }

  @Public()
  @Post("session")
  @HttpCode(HttpStatus.OK)
  async create(@Body() body: CreateStripeCheckoutSessionDto) {
    return this.stripe.createSession(body);
  }

  @Public()
  @UseGuards(InternalAuthGuard)
  @SetMetadata(INTERNAL_AUTH_REQUIRED_KEY, true)
  @Post("order-sync-preview")
  @HttpCode(HttpStatus.OK)
  async orderSyncPreview(@Body() body: CreateStripeCheckoutSessionDto & { sessionId?: string; paymentIntentId?: string }) {
    return this.stripe.previewOrderSync(body);
  }

  @Public()
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
