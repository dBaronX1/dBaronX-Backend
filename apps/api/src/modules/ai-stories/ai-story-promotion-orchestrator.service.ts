import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { AiStoryIntelligenceService } from "./ai-story-intelligence.service";
import { StoryPromotionRiskDto } from "./dto/story-promotion-risk.dto";

@Injectable()
export class AiStoryPromotionOrchestratorService {
  constructor(
    private readonly aiStoryIntelligence: AiStoryIntelligenceService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async evaluateAndAudit(
    body: StoryPromotionRiskDto,
    requestId?: string,
  ) {
    const risk = await this.aiStoryIntelligence.promotionRisk(body, requestId);
    const decision = risk.creatorPromotionRisk;
    const allow = isAllowDecision(decision) ? decision.allow : Boolean(decision);

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "ai_story_promotion",
      routePath: "/api/v1/ai-stories/orchestration/promotion-risk",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: toRecord(decision),
      decisionType: "ai_story_promotion_risk",
      metadata: {
        creatorAccountId: body.creatorAccountId,
        targetChannel: body.targetChannel,
        proposedSpendAmount: body.proposedSpendAmount,
      },
      tags: ["ai-stories", "promotion", "risk"],
    });

    if (!allow) {
      throw new BadRequestException({
        success: false,
        message: "AI story promotion not approved",
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
