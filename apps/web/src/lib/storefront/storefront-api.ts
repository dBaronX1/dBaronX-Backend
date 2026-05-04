import { internalApiRequest } from "@/lib/http/internal-api-client";
import { fetchMedusaStoreProducts } from "@/lib/medusa/store-client";

export interface StorefrontCatalogSummary {
  productSyncCount: number;
  variantSyncCount: number;
  recentProducts: Record<string, unknown>[];
  recentVariants: Record<string, unknown>[];
  degradedReason?: string | null;
}

export interface StorefrontOrderSummary {
  orderSyncCount: number;
  fulfillmentSyncCount: number;
  recentOrders: Record<string, unknown>[];
  recentFulfillments: Record<string, unknown>[];
}

export async function getStorefrontCatalogSummary(): Promise<StorefrontCatalogSummary> {
  try {
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
  } catch {
    const medusa = await fetchMedusaStoreProducts().catch(() => ({ products: [] as Record<string, unknown>[], reason: "medusa_store_unreachable" as const }));
    const variants = medusa.products.flatMap((product) =>
      Array.isArray((product as { variants?: unknown[] }).variants)
        ? ((product as { variants?: Record<string, unknown>[] }).variants || []).map((variant) => ({
            ...variant,
            product_id: String((product as { id?: string }).id || ""),
          }))
        : [],
    );

    return {
      productSyncCount: medusa.products.length,
      variantSyncCount: variants.length,
      recentProducts: medusa.products.slice(0, 20),
      recentVariants: variants.slice(0, 20),
      degradedReason:
        medusa.products.length > 0 && variants.length === 0
          ? "products visible but variants not synced"
          : ("reason" in medusa ? medusa.reason : null),
    };
  }
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
