export interface MedusaAdminHeaders {
  "x-request-id"?: string;
  "x-caller-service"?: string;
  "x-caller-surface"?: string;
}

export interface MedusaProductSummary {
  id: string;
  title: string;
  subtitle?: string | null;
  handle?: string | null;
  status?: string | null;
  thumbnail?: string | null;
  collection_id?: string | null;
  type_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface MedusaVariantSummary {
  id: string;
  title?: string | null;
  sku?: string | null;
  inventory_quantity?: number | null;
  allow_backorder?: boolean | null;
  manage_inventory?: boolean | null;
  prices?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown> | null;
}

export interface MedusaOrderSummary {
  id: string;
  display_id?: number | null;
  status?: string | null;
  payment_status?: string | null;
  fulfillment_status?: string | null;
  email?: string | null;
  currency_code?: string | null;
  total?: number | null;
  subtotal?: number | null;
  shipping_total?: number | null;
  tax_total?: number | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MedusaBridgeHealth {
  ready: boolean;
  medusaReachable: boolean;
  publishableKeyConfigured: boolean;
  adminApiKeyConfigured: boolean;
  blockers: string[];
}

export interface ManualOrderSyncPayload {
  medusaOrderId: string;
  customerId?: string | null;
  affiliateUserId?: string | null;
  supplierId?: string | null;
  externalReference?: string | null;
  syncMode: "create" | "update" | "reconcile";
  metadata?: Record<string, unknown>;
}
