import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type StoreProduct = Record<string, unknown>;

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
      products: [],
      message: "Products are temporarily unavailable. Please try again shortly or contact support.",
    },
    {
      status,
      headers: { "cache-control": "no-store, max-age=0" },
    },
  );
}

export async function GET() {
  const { backendUrl, publishableKey } = storeConfig();
  if (!backendUrl || !publishableKey) {
    console.error("[store-products] missing backend URL or publishable key");
    return safeFailure();
  }

  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.set("limit", "20");

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
      return safeFailure();
    }

    return NextResponse.json(
      {
        success: true,
        products: extractProducts(payload),
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-products] upstream product list unreachable", error);
    return safeFailure();
  }
}
