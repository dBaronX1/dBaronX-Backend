import { NextResponse } from "next/server";

import { extractStoreProducts, getMedusaStoreServerConfig } from "@/lib/store-products-server";

type StoreProduct = Record<string, unknown> & { handle?: string };

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

function safeProduct(product: StoreProduct): StoreProduct {
  const { publishable_key, publishableKey, api_key, apiKey, ...rest } = product;
  void publishable_key;
  void publishableKey;
  void api_key;
  void apiKey;
  return rest;
}

export async function storeProductsResponse({ handle = "", limit = "20" }: { handle?: string; limit?: string } = {}) {
  const { backendUrl, publishableKey } = getMedusaStoreServerConfig();
  if (!backendUrl || !publishableKey) {
    console.error("[store-products] product backend configuration is missing");
    return safeFailure(200, handle);
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
      return safeFailure(200, handle);
    }

    const products = extractStoreProducts(payload).map((product) => safeProduct(product as StoreProduct));
    const product = handle ? products.find((item) => item.handle === handle) || products[0] || null : undefined;

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
    return safeFailure(200, handle);
  }
}
