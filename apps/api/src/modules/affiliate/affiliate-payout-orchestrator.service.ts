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
    const decision = risk.affiliatePayoutRisk;
    const allow = isAllowDecision(decision) ? decision.allow : Boolean(decision);

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "affiliate_payout",
      routePath: "/api/v1/affiliate/orchestration/payout-risk",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: toRecord(decision),
      decisionType: "affiliate_payout_risk",
      metadata: {
        accountId: body.accountId,
        payoutMethod: body.payoutMethod,
      },
      tags: ["affiliate", "payout", "risk"],
    });

    if (!allow) {
      throw new BadRequestException({
        success: false,
        message: "Affiliate payout not approved",
        decision,
      });
    }

    return {
      success: true,
      approved: true,
      decision,
    };
  }
}

function isAllowDecision(value: unknown): value is { allow: boolean } {
  return typeof value === "object" && value !== null && "allow" in value;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : { value };
}
