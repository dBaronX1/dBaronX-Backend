import { Injectable } from "@nestjs/common";
import { FastapiIntelligenceHttpService } from "./fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "./internal-request-headers.service";
import {
  AffiliatePayoutRiskPayload,
  AffiliateVelocityPayload,
  PaymentPreflightPayload,
  StoryPromotionRiskPayload,
  WatchRewardDecisionPayload,
} from "../contracts/decision-payload.contract";

@Injectable()
export class FastapiDecisionOrchestratorService {
  constructor(
    private readonly fastapiHttp: FastapiIntelligenceHttpService,
    private readonly headers: InternalRequestHeadersService,
  ) {}

  async decideWatchReward(payload: WatchRewardDecisionPayload, requestId?: string) {
    return this.fastapiHttp.post<
      {
        reward_decision: {
          allow: boolean;
          decision: "allow" | "review" | "deny";
          decision_score: number;
          telemetry: Record<string, unknown>;
          trust: Record<string, unknown>;
          reasons: string[];
        };
      },
      Record<string, unknown>
    >(
      "/w2e-reward-decision/decide",
      {
        session_id: payload.sessionId,
        account_id: payload.accountId,
        headers: {},
        ip: payload.ip,
        declared_duration_seconds: payload.declaredDurationSeconds,
        heartbeat_intervals_ms: payload.heartbeatIntervalsMs,
        total_heartbeats: payload.totalHeartbeats,
        hidden_event_count: payload.hiddenEventCount || 0,
        blur_event_count: payload.blurEventCount || 0,
        seek_event_count: payload.seekEventCount || 0,
        playback_rate_max: payload.playbackRateMax ?? 1,
        muted_ratio: payload.mutedRatio ?? 0,
        duplicate_claim_attempts: payload.duplicateClaimAttempts || 0,
        recent_ip_events: payload.recentIpEvents || [],
        distinct_accounts_24h: payload.distinctAccounts24h || 0,
        failed_captcha_1h: payload.failedCaptcha1h || 0,
        denied_watch_claims_24h: payload.deniedWatchClaims24h || 0,
        account_age_days: payload.accountAgeDays || 0,
        email_verified: payload.emailVerified || false,
        phone_verified: payload.phoneVerified || false,
        completed_orders: payload.completedOrders || 0,
        successful_watches_30d: payload.successfulWatches30d || 0,
        denied_watches_30d: payload.deniedWatches30d || 0,
        affiliate_payout_rejections_180d:
          payload.affiliatePayoutRejections180d || 0,
        chargebacks_365d: payload.chargebacks365d || 0,
        policy_flags_180d: payload.policyFlags180d || 0,
        device_count_30d: payload.deviceCount30d || 1,
      },
      this.headers.forEconomicBrain(requestId),
    );
  }

  async evaluateAffiliateVelocity(
    payload: AffiliateVelocityPayload,
    requestId?: string,
  ) {
    return this.fastapiHttp.post<
      {
        affiliate_velocity: {
          affiliate_user_id: string;
          risk_score: number;
          risk_level: string;
          allow: boolean;
          signals: Record<string, unknown>;
          reasons: string[];
        };
      },
      Record<string, unknown>
    >(
      "/affiliate-velocity/evaluate",
      {
        affiliate_user_id: payload.affiliateUserId,
        clicks_last_10m: payload.clicksLast10m || 0,
        clicks_last_1h: payload.clicksLast1h || 0,
        distinct_ips_last_1h: payload.distinctIpsLast1h || 0,
        signups_last_24h: payload.signupsLast24h || 0,
        qualified_watches_last_24h: payload.qualifiedWatchesLast24h || 0,
        payouts_requested_last_7d: payload.payoutsRequestedLast7d || 0,
        duplicate_device_clusters_last_24h:
          payload.duplicateDeviceClustersLast24h || 0,
        conversion_rate_24h: payload.conversionRate24h ?? null,
      },
      this.headers.forEconomicBrain(requestId),
    );
  }

  async evaluateAffiliatePayoutRisk(
    payload: AffiliatePayoutRiskPayload,
    requestId?: string,
  ) {
    return this.fastapiHttp.post<
      {
        affiliate_payout_risk: {
          account_id: string;
          payout_method: string;
          risk_score: number;
          decision: "allow" | "review" | "deny";
          allow: boolean;
          trust: Record<string, unknown>;
          velocity: Record<string, unknown>;
          ip_reputation: Record<string, unknown>;
          reasons: string[];
        };
      },
      Record<string, unknown>
    >(
      "/affiliate-payout-risk/evaluate",
      {
        account_id: payload.accountId,
        payout_amount: payload.payoutAmount,
        payout_method: payload.payoutMethod,
        ip: payload.ip,
        recent_ip_events: payload.recentIpEvents || [],
        distinct_accounts_24h: payload.distinctAccounts24h || 0,
        failed_captcha_1h: payload.failedCaptcha1h || 0,
        affiliate_velocity: payload.affiliateVelocity || {},
        account_profile: {
          account_age_days: payload.accountAgeDays || 0,
          email_verified: payload.emailVerified || false,
          phone_verified: payload.phoneVerified || false,
          completed_orders: payload.completedOrders || 0,
          successful_watches_30d: payload.successfulWatches30d || 0,
          denied_watches_30d: payload.deniedWatches30d || 0,
          affiliate_payout_rejections_180d:
            payload.affiliatePayoutRejections180d || 0,
          chargebacks_365d: payload.chargebacks365d || 0,
          policy_flags_180d: payload.policyFlags180d || 0,
          device_count_30d: payload.deviceCount30d || 1,
        },
        recent_payout_requests_30d: payload.recentPayoutRequests30d || 0,
        average_payout_amount_90d: payload.averagePayoutAmount90d ?? null,
      },
      this.headers.forEconomicBrain(requestId),
    );
  }

  async decidePaymentPreflight(
    payload: PaymentPreflightPayload,
    requestId?: string,
  ) {
    return this.fastapiHttp.post<
      {
        payment_preflight: {
          allow: boolean;
          decision: "allow" | "review" | "deny";
          decision_score: number;
          telemetry: Record<string, unknown>;
          trust: Record<string, unknown>;
          reasons: string[];
        };
      },
      Record<string, unknown>
    >(
      "/payment-preflight-decision/decide",
      {
        order_id: payload.orderId,
        account_id: payload.accountId,
        headers: {},
        ip: payload.ip,
        amount: payload.amount,
        currency: payload.currency,
        failed_payments_24h: payload.failedPayments24h || 0,
        attempts_last_1h: payload.attemptsLast1h || 0,
        distinct_cards_last_24h: payload.distinctCardsLast24h || 0,
        distinct_accounts_from_ip_24h: payload.distinctAccountsFromIp24h || 0,
        recent_ip_events: payload.recentIpEvents || [],
        account_age_days: payload.accountAgeDays || 0,
        email_verified: payload.emailVerified || false,
        phone_verified: payload.phoneVerified || false,
        completed_orders: payload.completedOrders || 0,
        successful_watches_30d: payload.successfulWatches30d || 0,
        denied_watches_30d: payload.deniedWatches30d || 0,
        affiliate_payout_rejections_180d:
          payload.affiliatePayoutRejections180d || 0,
        chargebacks_365d: payload.chargebacks365d || 0,
        policy_flags_180d: payload.policyFlags180d || 0,
        device_count_30d: payload.deviceCount30d || 1,
      },
      this.headers.forEconomicBrain(requestId),
    );
  }

  async evaluateStoryPromotionRisk(
    payload: StoryPromotionRiskPayload,
    requestId?: string,
  ) {
    return this.fastapiHttp.post<
      {
        creator_promotion_risk: {
          creator_account_id: string;
          decision: "allow" | "review" | "deny";
          allow: boolean;
          risk_score: number;
          trust: Record<string, unknown>;
          eligibility: Record<string, unknown>;
          reasons: string[];
        };
      },
      Record<string, unknown>
    >(
      "/creator-promotion-risk/evaluate",
      {
        creator_account_id: payload.creatorAccountId,
        title: payload.title,
        content: payload.content,
        creator_profile: payload.creatorProfile,
        target_channel: payload.targetChannel,
        proposed_spend_amount: payload.proposedSpendAmount,
        prompt: payload.prompt ?? null,
        language: payload.language ?? null,
        tags: payload.tags ?? null,
        comparison_contents: payload.comparisonContents ?? null,
        market_context: payload.marketContext ?? null,
        story_promotion_count_30d: payload.storyPromotionCount30d || 0,
        creator_chargebacks_365d: payload.creatorChargebacks365d || 0,
        average_story_spend_90d: payload.averageStorySpend90d ?? null,
      },
      this.headers.forEconomicBrain(requestId),
    );
  }
}
