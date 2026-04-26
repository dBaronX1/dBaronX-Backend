export interface DecisionRecentIpEvent {
  country?: string | null;
  asn?: string | null;
  city?: string | null;
  source?: string | null;
}

export interface DecisionAccountProfile {
  accountAgeDays?: number;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  completedOrders?: number;
  successfulWatches30d?: number;
  deniedWatches30d?: number;
  affiliatePayoutRejections180d?: number;
  chargebacks365d?: number;
  policyFlags180d?: number;
  deviceCount30d?: number;
}

export interface WatchRewardDecisionPayload extends DecisionAccountProfile {
  sessionId: string;
  accountId: string;
  ip: string;
  declaredDurationSeconds: number;
  heartbeatIntervalsMs: number[];
  totalHeartbeats: number;
  hiddenEventCount?: number;
  blurEventCount?: number;
  seekEventCount?: number;
  playbackRateMax?: number;
  mutedRatio?: number;
  duplicateClaimAttempts?: number;
  distinctAccounts24h?: number;
  failedCaptcha1h?: number;
  deniedWatchClaims24h?: number;
  recentIpEvents?: DecisionRecentIpEvent[];
}

export interface AffiliateVelocityPayload {
  affiliateUserId: string;
  clicksLast10m?: number;
  clicksLast1h?: number;
  distinctIpsLast1h?: number;
  signupsLast24h?: number;
  qualifiedWatchesLast24h?: number;
  payoutsRequestedLast7d?: number;
  duplicateDeviceClustersLast24h?: number;
  conversionRate24h?: number | null;
}

export interface AffiliatePayoutRiskPayload extends DecisionAccountProfile {
  accountId: string;
  payoutAmount: number;
  payoutMethod: string;
  ip: string;
  recentIpEvents?: DecisionRecentIpEvent[];
  distinctAccounts24h?: number;
  failedCaptcha1h?: number;
  affiliateVelocity?: Omit<AffiliateVelocityPayload, "affiliateUserId">;
  recentPayoutRequests30d?: number;
  averagePayoutAmount90d?: number | null;
}

export interface PaymentPreflightPayload extends DecisionAccountProfile {
  orderId: string;
  accountId: string;
  ip: string;
  amount: number;
  currency: string;
  failedPayments24h?: number;
  attemptsLast1h?: number;
  distinctCardsLast24h?: number;
  distinctAccountsFromIp24h?: number;
  recentIpEvents?: DecisionRecentIpEvent[];
}

export interface StoryPromotionRiskPayload extends DecisionAccountProfile {
  creatorAccountId: string;
  title: string;
  content: string;
  creatorProfile: Record<string, unknown>;
  targetChannel: string;
  proposedSpendAmount: number;
  prompt?: string | null;
  language?: string | null;
  tags?: string[] | null;
  comparisonContents?: string[] | null;
  marketContext?: Record<string, unknown> | null;
  storyPromotionCount30d?: number;
  creatorChargebacks365d?: number;
  averageStorySpend90d?: number | null;
}
