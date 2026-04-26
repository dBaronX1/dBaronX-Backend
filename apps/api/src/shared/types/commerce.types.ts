export interface CommerceProductEntity {
  id: string;
  medusaProductId?: string | null;
  title: string;
  handle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  status: "draft" | "proposed" | "published" | "rejected" | "archived";
  collectionId?: string | null;
  categoryId?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommerceVariantEntity {
  id: string;
  productId: string;
  medusaVariantId?: string | null;
  title: string;
  sku?: string | null;
  inventoryQuantity?: number | null;
  priceCents: number;
  currency: string;
  options?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface CommerceCartEntity {
  id: string;
  medusaCartId?: string | null;
  userId?: string | null;
  email?: string | null;
  currency: string;
  subtotalCents: number;
  totalCents: number;
  itemCount: number;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommerceCheckoutSession {
  cartId: string;
  medusaCartId?: string | null;
  userId?: string | null;
  email: string;
  amountCents: number;
  currency: string;
  availablePaymentMethods: string[];
  metadata?: Record<string, unknown>;
}

export interface CommerceBridgeResult<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  raw?: unknown;
}