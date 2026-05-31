import { NextResponse } from "next/server";

import { nestApiRequest } from "@/server/api/nest-api.client";
import { apiCatalogPath, extractStoreProducts, normalizeServerStoreProduct } from "@/lib/store-products-server";

type CatalogProductsPayload = {
  success?: boolean;
  source?: string;
  product?: unknown;
  products?: unknown[];
  count?: number;
  message?: string;
  code?: string;
};

function safeFailure(status = 200, handle?: string, code = "products_unavailable") {
  return NextResponse.json(
    {
      success: false,
      code,
      product: handle ? null : undefined,
      products: [],
      source: "nestjs_api_catalog",
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

export async function storeProductsResponse({ handle = "", limit = "20" }: { handle?: string; limit?: string; category?: string } = {}) {
  const cleanHandle = handle.trim();
  const cleanLimit = Math.max(Number(limit) || 20, 1);
  const path = apiCatalogPath({ handle: cleanHandle || undefined, limit: cleanLimit });

  try {
    const response = await nestApiRequest<CatalogProductsPayload>({ path });
    const payload = response.data;
    const products = extractStoreProducts(payload).map(normalizeServerStoreProduct).slice(0, cleanHandle ? 5 : cleanLimit);
    const product = cleanHandle ? products.find((item) => item.handle === cleanHandle) || products[0] || null : undefined;

    if (!response.ok || (cleanHandle && !product) || (!cleanHandle && products.length === 0)) {
      return safeFailure(200, cleanHandle, payload?.code || (cleanHandle ? "api_catalog_product_handle_missing" : "api_catalog_products_empty"));
    }

    return NextResponse.json(
      {
        success: cleanHandle ? Boolean(product) : true,
        source: "nestjs_api_catalog",
        ...(cleanHandle ? { product } : {}),
        products: cleanHandle && product ? [product] : products,
        count: cleanHandle && product ? 1 : products.length,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-products] NestJS API catalog request failed", error);
    return safeFailure(200, cleanHandle, "api_catalog_unreachable");
  }
}
