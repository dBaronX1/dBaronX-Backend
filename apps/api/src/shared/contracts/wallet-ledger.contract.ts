export type LedgerDirection = "credit" | "debit";
export type LedgerSource =
  | "watch_reward"
  | "affiliate_payout"
  | "checkout_payment"
  | "manual_adjustment"
  | "story_promotion"
  | "supplier_settlement"
  | "refund";

export interface WalletBalanceSnapshot {
  userId: string;
  currency: string;
  availableBalance: number;
  lockedBalance: number;
  pendingBalance: number;
  updatedAt: string;
}

export interface LedgerEntryInput {
  userId: string;
  currency: string;
  amount: number;
  direction: LedgerDirection;
  source: LedgerSource;
  referenceId: string;
  referenceType: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface WalletAdjustmentInput {
  userId: string;
  currency: string;
  amount: number;
  reason: string;
  actorId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface PayoutEligibilityResult {
  eligible: boolean;
  blockers: string[];
  availableBalance: number;
  requestedAmount: number;
  currency: string;
}
