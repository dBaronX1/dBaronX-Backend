import type { SUPPLIER_STATUSES } from "../constants/system.constants";

export type SupplierStatus = (typeof SUPPLIER_STATUSES)[number];

export interface SupplierEntity {
  id: string;
  name: string;
  slug?: string | null;
  type: "dropshipping" | "print_on_demand" | "local" | "farm" | "recycling" | "soap" | string;
  status: SupplierStatus;
  contactEmail?: string | null;
  contactPhone?: string | null;
  countryCode?: string | null;
  apiBaseUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierProductMappingEntity {
  id: string;
  supplierId: string;
  productId?: string | null;
  variantId?: string | null;
  supplierProductId: string;
  supplierVariantId?: string | null;
  costCents: number;
  currency: string;
  leadTimeDays?: number | null;
  active: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierOrderEntity {
  id: string;
  supplierId: string;
  orderId: string;
  medusaOrderId?: string | null;
  externalOrderId?: string | null;
  status: "pending" | "submitted" | "accepted" | "shipped" | "delivered" | "cancelled" | "failed";
  costCents: number;
  currency: string;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
}