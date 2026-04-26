import { Injectable } from "@nestjs/common";
import { AffiliatePayoutRiskDto } from "../../modules/affiliate/dto/affiliate-payout-risk.dto";
import { StoryPromotionRiskDto } from "../../modules/ai-stories/dto/story-promotion-risk.dto";
import { PaymentPreflightIntelligenceDto } from "../../modules/payments/dto/payment-preflight-intelligence.dto";
import { WatchRewardDecisionDto } from "../../modules/watch/dto/watch-reward-decision.dto";
import { AffiliatePayoutOrchestratorService } from "../../modules/affiliate/affiliate-payout-orchestrator.service";
import { AiStoryPromotionOrchestratorService } from "../../modules/ai-stories/ai-story-promotion-orchestrator.service";
import { PaymentPreflightOrchestratorService } from "../../modules/payments/payment-preflight-orchestrator.service";
import { WatchRewardOrchestratorService } from "../../modules/watch/watch-reward-orchestrator.service";

@Injectable()
export class IntelligenceDecisionFacadeService {
  constructor(
    private readonly watchRewardOrchestrator: WatchRewardOrchestratorService,
    private readonly affiliatePayoutOrchestrator: AffiliatePayoutOrchestratorService,
    private readonly paymentPreflightOrchestrator: PaymentPreflightOrchestratorService,
    private readonly aiStoryPromotionOrchestrator: AiStoryPromotionOrchestratorService,
  ) {}

  async decideWatchReward(body: WatchRewardDecisionDto, requestId?: string) {
    return this.watchRewardOrchestrator.decideAndAudit(body, requestId);
  }

  async decideAffiliatePayoutRisk(
    body: AffiliatePayoutRiskDto,
    requestId?: string,
  ) {
    return this.affiliatePayoutOrchestrator.evaluateAndAudit(body, requestId);
  }

  async decidePaymentPreflight(
    body: PaymentPreflightIntelligenceDto,
    requestId?: string,
  ) {
    return this.paymentPreflightOrchestrator.evaluateAndAudit(body, requestId);
  }

  async decideAiStoryPromotion(
    body: StoryPromotionRiskDto,
    requestId?: string,
  ) {
    return this.aiStoryPromotionOrchestrator.evaluateAndAudit(body, requestId);
  }
}
