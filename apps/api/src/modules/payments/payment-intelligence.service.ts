import { Injectable } from "@nestjs/common";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { PaymentPreflightIntelligenceDto } from "./dto/payment-preflight-intelligence.dto";

@Injectable()
export class PaymentIntelligenceService {
  constructor(
    private readonly decisions: FastapiDecisionOrchestratorService,
  ) {}

  async preflight(body: PaymentPreflightIntelligenceDto, requestId?: string) {
    const response = await this.decisions.decidePaymentPreflight(
      {
        orderId: body.orderId,
        accountId: body.accountId,
        ip: body.ip,
        amount: body.amount,
        currency: body.currency,
        failedPayments24h: body.failedPayments24h,
        attemptsLast1h: body.attemptsLast1h,
        distinctCardsLast24h: body.distinctCardsLast24h,
        distinctAccountsFromIp24h: body.distinctAccountsFromIp24h,
        recentIpEvents: body.recentIpEvents,
        accountAgeDays: body.accountAgeDays,
        emailVerified: body.emailVerified,
        phoneVerified: body.phoneVerified,
        completedOrders: body.completedOrders,
        successfulWatches30d: body.successfulWatches30d,
        deniedWatches30d: body.deniedWatches30d,
        affiliatePayoutRejections180d: body.affiliatePayoutRejections180d,
        chargebacks365d: body.chargebacks365d,
        policyFlags180d: body.policyFlags180d,
        deviceCount30d: body.deviceCount30d,
      },
      requestId,
    );

    const paymentPreflight = response.payment_preflight && typeof response.payment_preflight === "object"
      ? response.payment_preflight
      : {
          allow: false,
          decision: "deny" as const,
          decision_score: 1,
          telemetry: {},
          trust: {},
          reasons: ["missing_payment_preflight_payload"],
        };

    return {
      success: true,
      paymentPreflight,
    };
  }
}
