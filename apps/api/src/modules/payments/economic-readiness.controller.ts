import { Body, Controller, Get, HttpCode, HttpStatus, Post, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { PaymentReadinessService } from "./payment-readiness.service";

@ApiTags("economic-readiness")
@Public()
@Controller({ path: "payments", version: VERSION_NEUTRAL })
export class EconomicReadinessController {
  constructor(private readonly readiness: PaymentReadinessService) {}

  @Get("economic-readiness")
  @ApiOperation({
    summary: "Unified economic event readiness contract for checkout settlement safety",
  })
  snapshot() {
    const payment = this.readiness.snapshot();
    const blockers = [
      ...(payment.webhookSafetyPathReady ? [] : ["stripe_webhook_safety_path_missing"]),
      ...(payment.frontendRedirectCanMarkPaid === false ? [] : ["frontend_redirect_can_mark_paid"]),
    ];

    return {
      success: blockers.length === 0,
      ready: blockers.length === 0,
      paymentMarkedPaidAuthority: payment.paidStateAuthority,
      verifiedWebhookRequired: true,
      unsignedWebhookCanMarkPaid: false,
      frontendRedirectCanMarkPaid: false,
      fakeSettlementBlocked: true,
      orderSyncReady: payment.orderSyncReady,
      orderSyncBlockers: payment.orderSyncBlockers,
      blockers,
      warnings: payment.warnings,
    };
  }

  @Post("economic-events/dry-run")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dry-run economic event contract without mutating paid/order state",
  })
  dryRun(@Body() body: Record<string, unknown>) {
    const payment = this.readiness.snapshot();
    const eventType = typeof body?.eventType === "string" ? body.eventType : "checkout.session.completed";

    return {
      success: true,
      dryRun: true,
      eventAccepted: true,
      eventType,
      paymentMarkedPaid: false,
      orderCompleted: false,
      verifiedWebhookRequired: true,
      fakeSettlementBlocked: true,
      orderSyncReady: payment.orderSyncReady,
      blockers: payment.orderSyncReady ? [] : ["payment_verified_order_sync_pending", ...payment.orderSyncBlockers],
    };
  }
}
