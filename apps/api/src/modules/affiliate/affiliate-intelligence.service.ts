import { Injectable } from "@nestjs/common";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { AffiliatePayoutRiskDto } from "./dto/affiliate-payout-risk.dto";

@Injectable()
export class AffiliateIntelligenceService {
  constructor(
    private readonly decisions: FastapiDecisionOrchestratorService,
  ) {}

  async payoutRisk(body: AffiliatePayoutRiskDto, requestId?: string) {
    const response = await this.decisions.evaluateAffiliatePayoutRisk(
      {
        accountId: body.accountId,
        payoutAmount: body.payoutAmount,
        payoutMethod: body.payoutMethod,
        ip: body.ip,
        recentIpEvents: body.recentIpEvents,
        distinctAccounts24h: body.distinctAccounts24h,
        failedCaptcha1h: body.failedCaptcha1h,
        affiliateVelocity: body.affiliateVelocity
          ? {
              clicksLast10m: body.affiliateVelocity.clicksLast10m,
              clicksLast1h: body.affiliateVelocity.clicksLast1h,
              distinctIpsLast1h: body.affiliateVelocity.distinctIpsLast1h,
              signupsLast24h: body.affiliateVelocity.signupsLast24h,
              qualifiedWatchesLast24h:
                body.affiliateVelocity.qualifiedWatchesLast24h,
              payoutsRequestedLast7d:
                body.affiliateVelocity.payoutsRequestedLast7d,
              duplicateDeviceClustersLast24h:
                body.affiliateVelocity.duplicateDeviceClustersLast24h,
              conversionRate24h: body.affiliateVelocity.conversionRate24h,
            }
          : undefined,
        recentPayoutRequests30d: body.recentPayoutRequests30d,
        averagePayoutAmount90d: body.averagePayoutAmount90d,
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

    return {
      success: true,
      affiliatePayoutRisk: response.affiliate_payout_risk,
    };
  }
}
