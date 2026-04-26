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

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "watch_reward",
      routePath: "/api/v1/watch/orchestration/reward-decision",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: decision.rewardDecision as Record<string, unknown>,
      decisionType: "watch_reward_decision",
      metadata: {
        sessionId: body.sessionId,
        accountId: body.accountId,
      },
      tags: ["watch", "reward", "decision"],
    });

    if (!decision.rewardDecision.allow) {
      throw new BadRequestException({
        success: false,
        message: "Watch reward not approved",
        decision: decision.rewardDecision,
      });
    }

    return {
      success: true,
      approved: true,
      decision: decision.rewardDecision,
    };
  }
}
