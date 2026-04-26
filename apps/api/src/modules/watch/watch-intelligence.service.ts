import { Injectable } from "@nestjs/common";
import { FastapiDecisionOrchestratorService } from "../../shared/services/fastapi-decision-orchestrator.service";
import { WatchRewardDecisionDto } from "./dto/watch-reward-decision.dto";

@Injectable()
export class WatchIntelligenceService {
  constructor(
    private readonly decisions: FastapiDecisionOrchestratorService,
  ) {}

  async rewardDecision(body: WatchRewardDecisionDto, requestId?: string) {
    const response = await this.decisions.decideWatchReward(
      {
        sessionId: body.sessionId,
        accountId: body.accountId,
        ip: body.ip,
        declaredDurationSeconds: body.declaredDurationSeconds,
        heartbeatIntervalsMs: body.heartbeatIntervalsMs,
        totalHeartbeats: body.totalHeartbeats,
        hiddenEventCount: body.hiddenEventCount,
        blurEventCount: body.blurEventCount,
        seekEventCount: body.seekEventCount,
        playbackRateMax: body.playbackRateMax,
        mutedRatio: body.mutedRatio,
        duplicateClaimAttempts: body.duplicateClaimAttempts,
        distinctAccounts24h: body.distinctAccounts24h,
        failedCaptcha1h: body.failedCaptcha1h,
        deniedWatchClaims24h: body.deniedWatchClaims24h,
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

    return {
      success: true,
      rewardDecision: response.reward_decision,
    };
  }
}
