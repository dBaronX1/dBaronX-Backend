import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoreProduct = Record<string, unknown> & { handle?: string };

function cleanBaseUrl(value: string | undefined) {
  return (value || "").trim().replace(/\/+$/, "");
}

function storeConfig() {
  return {
    backendUrl: cleanBaseUrl(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BACKEND_URL),
    publishableKey: (process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.MEDUSA_PUBLISHABLE_KEY || "").trim(),
  };
}

function extractProducts(payload: unknown): StoreProduct[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  for (const key of ["products", "items", "data"]) {
    const value = nested[key];
    if (Array.isArray(value)) return value.filter((item): item is StoreProduct => Boolean(item && typeof item === "object"));
  }
  const product = nested.product;
  return product && typeof product === "object" ? [product as StoreProduct] : [];
}

function safeFailure(status = 200) {
  return NextResponse.json(
    {
      success: false,
      product: null,
      message: "This product is temporarily unavailable. Please try again shortly or contact support.",
    },
    {
      status,
      headers: { "cache-control": "no-store, max-age=0" },
    },
  );
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const safeHandle = decodeURIComponent(handle || "").trim();
  if (!safeHandle) return safeFailure(400);

  const { backendUrl, publishableKey } = storeConfig();
  if (!backendUrl || !publishableKey) {
    console.error("[store-product-detail] missing backend URL or publishable key", { handle: safeHandle });
    return safeFailure();
  }

  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.set("handle", safeHandle);
  url.searchParams.set("limit", "5");

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
      console.error("[store-product-detail] upstream product detail failed", {
        handle: safeHandle,
        status: response.status,
        statusText: response.statusText,
        payloadShape: payload && typeof payload === "object" ? Object.keys(payload as Record<string, unknown>) : typeof payload,
      });
      return safeFailure();
    }

    const products = extractProducts(payload);
    const product = products.find((item) => item.handle === safeHandle) || products[0] || null;
    return NextResponse.json(
      {
        success: Boolean(product),
        product,
        products: product ? [product] : [],
        message: product ? undefined : "This product is temporarily unavailable. Please try again shortly or contact support.",
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-product-detail] upstream product detail unreachable", { handle: safeHandle, error });
    return safeFailure();
  }
}
