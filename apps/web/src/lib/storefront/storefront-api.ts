import { internalApiRequest } from "@/lib/http/internal-api-client";

export interface StorefrontCatalogSummary {
  productSyncCount: number;
  variantSyncCount: number;
  recentProducts: Record<string, unknown>[];
  recentVariants: Record<string, unknown>[];
}

export interface StorefrontOrderSummary {
  orderSyncCount: number;
  fulfillmentSyncCount: number;
  recentOrders: Record<string, unknown>[];
  recentFulfillments: Record<string, unknown>[];
}

export async function getStorefrontCatalogSummary(): Promise<StorefrontCatalogSummary> {
  const commerce = await internalApiRequest<{
    commerceAdmin: {
      productSyncCount: number;
      variantSyncCount: number;
      recentProducts: Record<string, unknown>[];
      recentVariants: Record<string, unknown>[];
    };
  }>("/api/v1/commerce/admin/dashboard");

  return {
    productSyncCount: commerce.commerceAdmin.productSyncCount,
    variantSyncCount: commerce.commerceAdmin.variantSyncCount,
    recentProducts: commerce.commerceAdmin.recentProducts,
    recentVariants: commerce.commerceAdmin.recentVariants,
  };
}

export async function getStorefrontOrderSummary(): Promise<StorefrontOrderSummary> {
  const commerce = await internalApiRequest<{
    commerceAdmin: {
      orderSyncCount: number;
      fulfillmentSyncCount: number;
      recentOrders: Record<string, unknown>[];
      recentFulfillments: Record<string, unknown>[];
    };
  }>("/api/v1/commerce/admin/dashboard");

  return {
    orderSyncCount: commerce.commerceAdmin.orderSyncCount,
    fulfillmentSyncCount: commerce.commerceAdmin.fulfillmentSyncCount,
    recentOrders: commerce.commerceAdmin.recentOrders,
    recentFulfillments: commerce.commerceAdmin.recentFulfillments,
  };
}
