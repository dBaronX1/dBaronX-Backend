import { NextResponse } from "next/server";

import { fetchSupabaseStorefrontProductCache } from "@/lib/store-products-supabase-fallback";
import { extractStoreProducts, getMedusaStoreServerConfig, normalizeServerStoreProduct } from "@/lib/store-products-server";

type StorefrontProductsPayload = {
  success?: boolean;
  source?: string;
  product?: unknown;
  products?: unknown[];
  message?: string;
};

function safeFailure(status = 200, handle?: string, code = "products_unavailable") {
  return NextResponse.json(
    {
      success: false,
      code,
      product: handle ? null : undefined,
      products: [],
      message: handle
        ? "This product is temporarily unavailable. Please try again shortly or contact support."
        : "Products are temporarily unavailable. Please try again shortly or contact support.",
    },
    {
      status,
      headers: { "cache-control": "no-store, max-age=0" },
    },
  );
}

export async function storeProductsResponse({ handle = "", limit = "20", category = "" }: { handle?: string; limit?: string; category?: string } = {}) {
  const { backendUrl, publishableKey } = getMedusaStoreServerConfig();
  if (!backendUrl || !publishableKey) {
    console.error("[store-products] Medusa Store API configuration is missing", { hasBackendUrl: Boolean(backendUrl), hasPublishableKey: Boolean(publishableKey) });
    return productsFallbackOrSafeFailure(200, handle, limit);
  }

  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.set("limit", limit || "20");
  if (handle) url.searchParams.set("handle", handle);
  if (category) url.searchParams.set("category_id", category);

  try {
    const response = await nestApiRequest<StorefrontProductsPayload>({
      path: storefrontPath(cleanHandle, cleanLimit),
    });

    if (!response.ok) {
      console.error("[store-products] Medusa Store API product request failed", {
        status: response.status,
        handle: cleanHandle || undefined,
      });
      return safeFailure(200, handle, "medusa_store_products_http_error");
    }

    const products = extractStoreProducts(payload).map(normalizeServerStoreProduct);
    const product = handle ? products.find((item) => item.handle === handle) || null : undefined;
    if ((handle && !product) || (!handle && products.length === 0)) {
      console.warn("[store-products] Medusa returned no visible products", { handle: handle || undefined });
      return safeFailure(200, handle, handle ? "medusa_store_product_handle_missing" : "medusa_store_products_empty");
    }

    return NextResponse.json(
      {
        success: handle ? Boolean(product) : true,
        source: "medusa_store_api",
        ...(handle ? { product } : {}),
        products: handle && product ? [product] : products,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-products] Medusa Store API product request unreachable", error);
    return safeFailure(200, handle, "medusa_store_products_unreachable");
  }
}
