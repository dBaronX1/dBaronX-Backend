import { NextResponse } from "next/server";

import { nestApiRequest } from "@/server/api/nest-api.client";

type StorefrontProductsPayload = {
  success?: boolean;
  source?: string;
  product?: unknown;
  products?: unknown[];
  message?: string;
};

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

function storefrontPath(handle: string, limit: string) {
  const params = new URLSearchParams();
  params.set("limit", limit || (handle ? "5" : "20"));

  if (handle) {
    return `/api/storefront/products/${encodeURIComponent(handle)}?${params.toString()}`;
  }

  return `/api/storefront/products?${params.toString()}`;
}

function normalizePayload(payload: StorefrontProductsPayload | null, handle?: string): StorefrontProductsPayload {
  const products = Array.isArray(payload?.products) ? payload.products : [];
  const product = handle ? payload?.product ?? products[0] ?? null : undefined;

  return {
    success: handle ? Boolean(product) : payload?.success !== false,
    source: payload?.source || "nestjs_storefront_products",
    ...(handle ? { product } : {}),
    products: handle && product ? [product] : products,
    ...(payload?.message ? { message: payload.message } : {}),
  };
}

export async function storeProductsResponse({ handle = "", limit = "20" }: { handle?: string; limit?: string } = {}) {
  const cleanHandle = handle.trim();
  const cleanLimit = String(Number(limit || (cleanHandle ? 5 : 20)) || (cleanHandle ? 5 : 20));

  try {
    const response = await nestApiRequest<StorefrontProductsPayload>({
      path: storefrontPath(cleanHandle, cleanLimit),
    });

    if (!response.ok) {
      console.error("[store-products] NestJS storefront products request failed", {
        status: response.status,
        handle: cleanHandle || undefined,
      });
      return safeFailure(200, cleanHandle);
    }

    const payload = normalizePayload(response.data, cleanHandle);
    if ((cleanHandle && !payload.product) || (!cleanHandle && !payload.products?.length && payload.success === false)) {
      return safeFailure(200, cleanHandle);
    }

    return NextResponse.json(payload, {
      headers: { "cache-control": "no-store, max-age=0" },
    });
  } catch (error) {
    console.error("[store-products] NestJS storefront products request unreachable", error);
    return safeFailure(200, cleanHandle);
  }
}
