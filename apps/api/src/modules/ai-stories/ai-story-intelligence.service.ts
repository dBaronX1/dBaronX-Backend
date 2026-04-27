import { Injectable } from "@nestjs/common";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { StoryPromotionRiskDto } from "./dto/story-promotion-risk.dto";

@Injectable()
export class AiStoryIntelligenceService {
  constructor(
    private readonly decisions: FastapiDecisionOrchestratorService,
  ) {}

  async promotionRisk(body: StoryPromotionRiskDto, requestId?: string) {
    const response = await this.decisions.evaluateStoryPromotionRisk(
      {
        creatorAccountId: body.creatorAccountId,
        title: body.title,
        content: body.content,
        creatorProfile: body.creatorProfile,
        targetChannel: body.targetChannel,
        proposedSpendAmount: body.proposedSpendAmount,
        prompt: body.prompt,
        language: body.language,
        tags: body.tags,
        comparisonContents: body.comparisonContents,
        marketContext: body.marketContext,
        storyPromotionCount30d: body.storyPromotionCount30d,
        creatorChargebacks365d: body.creatorChargebacks365d,
        averageStorySpend90d: body.averageStorySpend90d,
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

    const creatorPromotionRisk = response.creator_promotion_risk && typeof response.creator_promotion_risk === "object"
      ? response.creator_promotion_risk
      : {
          creator_account_id: body.creatorAccountId,
          decision: "deny" as const,
          allow: false,
          risk_score: 100,
          trust: {},
          eligibility: {},
          reasons: ["missing_creator_promotion_risk_payload"],
        };

    return {
      success: true,
      creatorPromotionRisk,
    };
  }
}
