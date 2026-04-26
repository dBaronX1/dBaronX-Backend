export type AffiliateTierName =
  | "free"
  | "bronze"
  | "silver"
  | "gold"
  | "platinum";

export interface AffiliateEntity {
  id: string;
  userId: string;
  email: string;
  referralCode: string;
  createdAt: string;
}

export interface AffiliateEarningEntity {
  id: string;
  userId: string;
  amount: number;
  source?: string | null;
  sourceRef?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AffiliateProfileEntity {
  userId: string;
  email?: string | null;
  referralCode?: string | null;
  tier: AffiliateTierName;
  isActive: boolean;
  totalClicks: number;
  totalQualifiedViews: number;
  totalConversions: number;
  totalEarnings: number;
  availableBalance: number;
  lockedBalance: number;
}
