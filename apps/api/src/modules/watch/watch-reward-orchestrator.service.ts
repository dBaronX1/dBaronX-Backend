import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { WatchIntelligenceService } from "./watch-intelligence.service";
import { WatchRewardDecisionDto } from "./dto/watch-reward-decision.dto";

@Injectable()
export class WatchRewardOrchestratorService {
  constructor(
    private readonly watchIntelligence: WatchIntelligenceService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async decideAndAudit(body: WatchRewardDecisionDto, requestId?: string) {
    const decision = await this.watchIntelligence.rewardDecision(body, requestId);
    const rewardDecision = decision.rewardDecision;
    const allow = isAllowDecision(rewardDecision)
      ? rewardDecision.allow
      : Boolean(rewardDecision);

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "watch_reward",
      routePath: "/api/v1/watch/orchestration/reward-decision",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: toRecord(rewardDecision),
      decisionType: "watch_reward_decision",
      metadata: {
        sessionId: body.sessionId,
        accountId: body.accountId,
      },
      tags: ["watch", "reward", "decision"],
    });

    if (!allow) {
      throw new BadRequestException({
        success: false,
        message: "Watch reward not approved",
        decision: rewardDecision,
      });
    }

    return {
      success: true,
      approved: true,
      decision: rewardDecision,
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
