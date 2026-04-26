export type CommerceSyncStatus =
  | "pending"
  | "synced"
  | "degraded"
  | "failed"
  | "fulfilled"
  | "cancelled";

export interface CommerceProductSyncRecord {
  medusaProductId: string;
  handle?: string | null;
  title: string;
  status?: string | null;
  thumbnail?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CommerceOrderSyncRecord {
  medusaOrderId: string;
  displayId?: number | null;
  status?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  currencyCode?: string | null;
  total?: number | null;
  email?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CommerceFulfillmentSyncRecord {
  medusaOrderId: string;
  fulfillmentId: string;
  fulfillmentStatus: string;
  trackingNumbers: string[];
  providerId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CommerceBridgeBoundaryRule {
  domain: string;
  owner: "nestjs" | "medusa";
  prohibitedInMedusa: string[];
  prohibitedInNestjs: string[];
}
