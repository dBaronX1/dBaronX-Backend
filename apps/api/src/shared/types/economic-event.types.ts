export const ECONOMIC_EVENT_TYPES = [
  "commerce.checkout.payment_requested",
  "commerce.checkout.payment_verified",
  "commerce.order.settlement_requested",
  "ads.campaign.funding_requested",
  "ads.campaign.spend_debited",
  "watch.reward.earned",
  "watch.reward.held",
  "affiliate.commission.earned",
  "affiliate.commission.held",
  "affiliate.payout.requested",
  "ai_stories.credit.purchase_requested",
  "ai_stories.promotion.spend_debited",
  "dreams.pledge.created",
  "dreams.pledge.released",
  "wallet.hold.created",
  "wallet.hold.released",
  "wallet.ledger.entry_created",
  "payout.settlement.requested",
  "refund.requested",
  "refund.completed",
] as const;

export const ECONOMIC_SOURCE_MODULES = [
  "commerce",
  "ads",
  "watch",
  "affiliate",
  "ai_stories",
  "dreams",
  "wallet",
  "rewards",
  "subscriptions",
  "payouts",
  "payments",
] as const;

export const ECONOMIC_ASSET_TYPES = ["fiat", "dbx", "wallet_credit", "reward_point"] as const;
export const ECONOMIC_PAYMENT_RAILS = ["stripe", "paystack", "dbx", "wallet", "internal"] as const;
export const ECONOMIC_DIRECTIONS = ["debit", "credit", "hold", "release", "refund", "payout"] as const;
export const ECONOMIC_STATUSES = [
  "requested",
  "pending_verification",
  "verified",
  "settled",
  "failed",
  "reversed",
] as const;

export type EconomicEventType = (typeof ECONOMIC_EVENT_TYPES)[number];
export type EconomicSourceModule = (typeof ECONOMIC_SOURCE_MODULES)[number];
export type EconomicAssetType = (typeof ECONOMIC_ASSET_TYPES)[number];
export type EconomicPaymentRail = (typeof ECONOMIC_PAYMENT_RAILS)[number];
export type EconomicDirection = (typeof ECONOMIC_DIRECTIONS)[number];
export type EconomicStatus = (typeof ECONOMIC_STATUSES)[number];

export interface EconomicVerifierEvidence {
  verifier: "stripe" | "dbx_chain" | "fastapi" | "wallet_ledger" | "internal_ledger";
  reference: string;
  verifiedAt: string;
  signature?: string;
  riskDecisionId?: string;
  settlementReference?: string;
}

export interface EconomicEventMetadata {
  [key: string]: unknown;
  verifierEvidence?: EconomicVerifierEvidence;
}

export interface EconomicEvent {
  eventId: string;
  eventType: EconomicEventType;
  sourceModule: EconomicSourceModule;
  sourceRef: string;
  userId?: string | null;
  accountId?: string | null;
  currency: string;
  amountMinorUnits: number;
  assetType: EconomicAssetType;
  paymentRail: EconomicPaymentRail;
  direction: EconomicDirection;
  status: EconomicStatus;
  idempotencyKey: string;
  metadata?: EconomicEventMetadata;
  createdAt: string;
}

export type EconomicEventInput = Partial<EconomicEvent> & {
  eventType: EconomicEventType | string;
  sourceModule: EconomicSourceModule | string;
  sourceRef: string;
  currency: string;
  amountMinorUnits: number | string;
  assetType: EconomicAssetType | string;
  paymentRail: EconomicPaymentRail | string;
  direction: EconomicDirection | string;
  status?: EconomicStatus | string;
  idempotencyKey: string;
};

export interface EconomicEventValidationResult {
  valid: boolean;
  blockers: string[];
  event?: EconomicEvent;
  auditPayload?: Record<string, unknown>;
}

export interface EconomicEventRepository {
  findByIdempotencyKey(idempotencyKey: string): Promise<EconomicEvent | null>;
  append(event: EconomicEvent): Promise<EconomicEvent>;
}
