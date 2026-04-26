import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { AffiliateIntelligenceService } from "./affiliate-intelligence.service";
import { AffiliatePayoutRiskDto } from "./dto/affiliate-payout-risk.dto";

@Injectable()
export class AffiliatePayoutOrchestratorService {
  constructor(
    private readonly affiliateIntelligence: AffiliateIntelligenceService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async evaluateAndAudit(body: AffiliatePayoutRiskDto, requestId?: string) {
    const risk = await this.affiliateIntelligence.payoutRisk(body, requestId);

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "affiliate_payout",
      routePath: "/api/v1/affiliate/orchestration/payout-risk",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: risk.affiliatePayoutRisk as Record<string, unknown>,
      decisionType: "affiliate_payout_risk",
      metadata: {
        accountId: body.accountId,
        payoutMethod: body.payoutMethod,
      },
      tags: ["affiliate", "payout", "risk"],
    });

    if (!risk.affiliatePayoutRisk.allow) {
      throw new BadRequestException({
        success: false,
        message: "Affiliate payout not approved",
        decision: risk.affiliatePayoutRisk,
      });
    }

    return {
      success: true,
      approved: true,
      decision: risk.affiliatePayoutRisk,
    };
  }
}
