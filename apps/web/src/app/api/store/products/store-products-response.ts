import { NextResponse } from "next/server";

import { nestApiRequest } from "@/server/api/nest-api.client";
import { apiCatalogPath, extractStoreProducts, normalizeServerStoreProduct } from "@/lib/store-products-server";
import { productPrimaryImage, productPrimaryVariantId, type MedusaStoreProduct } from "@/lib/api/medusa-store-client";

type CatalogProductsPayload = {
  success?: boolean;
  source?: string;
  product?: unknown;
  products?: unknown[];
  count?: number;
  message?: string;
  code?: string;
  data?: CatalogProductsPayload;
};

function catalogEnvelope(payload: CatalogProductsPayload | null | undefined): CatalogProductsPayload {
  return payload?.data && typeof payload.data === "object" ? payload.data : payload || {};
}

function safeFailure(status = 200, handle?: string, code = "products_unavailable") {
  return NextResponse.json(
    {
      success: false,
      code,
      product: handle ? null : undefined,
      products: [],
      count: 0,
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

function isRenderableProduct(product: MedusaStoreProduct) {
  const priceMinor = Number(product.priceMinor || 0);
  const image = productPrimaryImage(product);
  return product.buyable === true && Boolean(productPrimaryVariantId(product)) && priceMinor > 0 && Boolean(image || (Array.isArray(product.images) && product.images.length > 0));
}

function categoryValue(product: MedusaStoreProduct) {
  const metadata = product.metadata && typeof product.metadata === "object" ? product.metadata : {};
  return String(product.category || metadata.category || metadata.categorySlug || metadata.label || metadata.searchLabel || product.supplier || "").trim().toLowerCase();
}

function applyCategoryFilter(products: MedusaStoreProduct[], category?: string) {
  const normalizedCategory = String(category || "").trim().toLowerCase();
  if (!normalizedCategory || normalizedCategory === "all") return products;
  const filtered = products.filter((product) => categoryValue(product) === normalizedCategory);
  return filtered.length ? filtered : products;
}

export async function storeProductsResponse({ handle = "", limit = "20", category = "" }: { handle?: string; limit?: string; category?: string } = {}) {
  const cleanHandle = handle.trim();
  const cleanLimit = Math.max(Number(limit) || 20, 1);
  const path = apiCatalogPath({ handle: cleanHandle || undefined, limit: cleanLimit });

  try {
    const response = await nestApiRequest<CatalogProductsPayload>({ path });
    const envelope = catalogEnvelope(response.data);
    const normalizedProducts = extractStoreProducts(response.data).map(normalizeServerStoreProduct);
    const renderableProducts = normalizedProducts.filter(isRenderableProduct);
    const products = applyCategoryFilter(renderableProducts, category).slice(0, cleanHandle ? 5 : cleanLimit);
    const product = cleanHandle ? products.find((item) => item.handle === cleanHandle) || products[0] || null : undefined;

    if (!response.ok || (cleanHandle && !product) || (!cleanHandle && products.length === 0)) {
      return safeFailure(200, cleanHandle, envelope?.code || (cleanHandle ? "api_catalog_product_handle_missing" : "api_catalog_products_empty"));
    }

    const count = cleanHandle && product ? 1 : Number(envelope.count || products.length);
    return NextResponse.json(
      {
        success: cleanHandle ? Boolean(product) : true,
        source: "nestjs_api_catalog",
        ...(cleanHandle ? { product } : {}),
        products: cleanHandle && product ? [product] : products,
        count,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-products] NestJS API catalog request failed", error);
    return safeFailure(200, cleanHandle, "api_catalog_unreachable");
  }
}
