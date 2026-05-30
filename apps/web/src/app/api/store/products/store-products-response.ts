import { NextResponse } from "next/server";

function cleanBaseUrl(value: string | undefined) {
  return (value || "").trim().replace(/\/+$/, "");
}

function apiBaseUrl() {
  return cleanBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || process.env.NESTJS_API_URL);
}

function safeFailure(status = 200, handle?: string, code = "catalog_unavailable") {
  return NextResponse.json(
    {
      success: false,
      code,
      product: handle ? null : undefined,
      products: [],
      count: 0,
      source: "nestjs_catalog_proxy",
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
  const path = handle ? `/api/catalog/products/${encodeURIComponent(handle)}` : "/api/catalog/products";
  const baseUrl = apiBaseUrl();
  if (!baseUrl) return safeFailure(200, handle, "api_base_url_missing");
  const url = new URL(`${baseUrl}${path}`);
  if (!handle) url.searchParams.set("limit", limit || "20");

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object") {
      console.error("[store-products] NestJS catalog proxy failed", { status: response.status, handle: handle || undefined });
      return safeFailure(200, handle, "nestjs_catalog_proxy_failed");
    }
    return NextResponse.json(
      {
        ...(payload as Record<string, unknown>),
        source: "nestjs_catalog_proxy",
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch (error) {
    console.error("[store-products] NestJS catalog proxy unreachable", error);
    return safeFailure(200, handle, "nestjs_catalog_proxy_unreachable");
  }
}
