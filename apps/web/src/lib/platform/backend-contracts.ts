export interface LaunchClosure {
  ready: boolean;
  blockers: string[];
  closure?: Record<string, unknown>;
  bootstrapHardening?: Record<string, unknown>;
  commerce?: Record<string, unknown>;
  boundary?: Record<string, unknown>;
  launchGate?: Record<string, unknown>;
}

export interface ReadinessMatrixSection {
  ready: boolean;
  summary: Record<string, unknown>;
}

export interface ReadinessMatrix {
  wallet: ReadinessMatrixSection;
  payouts: ReadinessMatrixSection;
  payments: ReadinessMatrixSection;
  suppliers: ReadinessMatrixSection;
  ads: ReadinessMatrixSection;
  aiStories: ReadinessMatrixSection;
  commerce: ReadinessMatrixSection;
  launchClosure: ReadinessMatrixSection;
}

export interface PlatformShell {
  ready: boolean;
  blockers: string[];
  orchestrationIndex: {
    modules: Record<string, string[]>;
  };
}

export interface PlatformAdminPack {
  shell: PlatformShell;
  summary: Record<string, unknown>;
  endpoints?: Record<string, string[]>;
}

export interface FastapiHandoffPack {
  closed: boolean;
  next_subsystem: string;
  handshake: Record<string, unknown>;
  enforcement: {
    closed: boolean;
    blockers: string[];
  };
  recommended_consumers: string[];
}

export interface CommerceAdminDashboard {
  orderSyncCount: number;
  productSyncCount: number;
  variantSyncCount: number;
  fulfillmentSyncCount: number;
  settlementCount: number;
  settlementTotals: {
    gross: number;
    supplierCost: number;
    affiliateCommission: number;
    merchantNet: number;
  };
  recentOrders: Record<string, unknown>[];
  recentProducts: Record<string, unknown>[];
  recentVariants: Record<string, unknown>[];
  recentFulfillments: Record<string, unknown>[];
  recentSettlements: Record<string, unknown>[];
}

export interface AiStoriesAdminDashboard {
  totalCampaigns: number;
  totalStories: number;
  campaignStatusCounts: Record<string, number>;
  recentCampaigns: Record<string, unknown>[];
  recentStories: Record<string, unknown>[];
}
