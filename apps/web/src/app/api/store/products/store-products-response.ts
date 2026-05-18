import { NextResponse } from "next/server";

import { fetchSupabaseStorefrontProductCache } from "@/lib/store-products-supabase-fallback";
import { extractStoreProducts, getMedusaStoreServerConfig, normalizeServerStoreProduct } from "@/lib/store-products-server";

async function productsFallbackOrSafeFailure(status = 200, handle?: string, limit?: string) {
  const fallback = await fetchSupabaseStorefrontProductCache({ handle, limit: Number(limit || 20) || 20 });
  const product = handle ? fallback.products.find((item) => item.handle === handle) || fallback.products[0] || null : undefined;
  if ((handle && product) || (!handle && fallback.products.length > 0)) {
    return NextResponse.json(
      {
        success: true,
        source: "supabase_storefront_product_cache_fallback",
        message: "Products are showing from a storefront cache. Checkout still requires Medusa availability.",
        ...(handle ? { product } : {}),
        products: handle && product ? [product] : fallback.products,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  }
  return safeFailure(status, handle);
}

function safeFailure(status = 200, handle?: string) {
  return NextResponse.json(
    {
      success: false,
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

export async function storeProductsResponse({ handle = "", limit = "20" }: { handle?: string; limit?: string } = {}) {
  const { backendUrl, publishableKey } = getMedusaStoreServerConfig();
  if (!backendUrl || !publishableKey) {
    console.error("[store-products] product backend configuration is missing");
    return productsFallbackOrSafeFailure(200, handle, limit);
  }

  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.set("limit", limit || "20");
  if (handle) url.searchParams.set("handle", handle);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-publishable-api-key": publishableKey,
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      console.error("[store-products] upstream product list failed", {
        status: response.status,
        statusText: response.statusText,
        payloadShape: payload && typeof payload === "object" ? Object.keys(payload as Record<string, unknown>) : typeof payload,
      });
      return productsFallbackOrSafeFailure(200, handle, limit);
    }

    const products = extractStoreProducts(payload).map(normalizeServerStoreProduct);
    const product = handle ? products.find((item) => item.handle === handle) || null : undefined;
    if ((handle && !product) || (!handle && products.length === 0)) {
      console.warn("[store-products] medusa returned no visible products; trying storefront cache fallback", { handle: handle || undefined });
      return productsFallbackOrSafeFailure(200, handle, limit);
    }

    return NextResponse.json(
      {
        success: handle ? Boolean(product) : true,
        ...(handle ? { product } : {}),
        products: handle && product ? [product] : products,
        ...(handle && !product ? { message: "This product is temporarily unavailable. Please try again shortly or contact support." } : {}),
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-products] upstream product list unreachable", error);
    return productsFallbackOrSafeFailure(200, handle, limit);
  }
}
