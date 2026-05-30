import { fetchSupabaseStorefrontProducts } from "@/lib/supabase-products";
import {
  normalizeStoreProduct,
  productPrimaryVariantId,
  type MedusaProductResult,
  type MedusaStoreProduct,
} from "@/lib/api/medusa-store-client";

function cleanBaseUrl(value: string | undefined) {
  return (value || "").trim().replace(/\/+$/, "");
}

export function getMedusaStoreServerConfig() {
  return {
    backendUrl: cleanBaseUrl(process.env.MEDUSA_BASE_URL || process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BASE_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL),
    publishableKey: (process.env.MEDUSA_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "").trim(),
  };
}

export function extractStoreProducts(payload: unknown): MedusaStoreProduct[] {
  const root = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const nested = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : root;
  for (const key of ["products", "items", "data"]) {
    const value = nested[key];
    if (Array.isArray(value)) return value.filter((item): item is MedusaStoreProduct => Boolean(item && typeof item === "object"));
  }
  const product = nested.product;
  return product && typeof product === "object" ? [product as MedusaStoreProduct] : [];
}

export function normalizeServerStoreProduct(product: MedusaStoreProduct): MedusaStoreProduct {
  return normalizeStoreProduct(product);
}

export async function fetchServerStoreProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  const { backendUrl, publishableKey } = getMedusaStoreServerConfig();
  if (!backendUrl || !publishableKey) return { products: [], reason: "products_unavailable" };

  const url = new URL(`${backendUrl}/store/products`);
  url.searchParams.set("limit", String(options.limit || 20));
  if (options.handle) url.searchParams.set("handle", options.handle);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "x-publishable-api-key": publishableKey,
      },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return { products: [], reason: "products_unavailable", status: response.status };
    const products = extractStoreProducts(payload).map(normalizeServerStoreProduct);
    return { products, reason: null, status: response.status };
  } catch {
    return { products: [], reason: "products_unavailable" };
  }
}

export async function fetchServerStoreProductByHandle(handle: string) {
  const result = await fetchServerStoreProducts({ handle, limit: 5 });
  const product = result.products.find((item) => item.handle === handle) || result.products[0] || null;
  return { product, reason: product ? null : result.reason || "products_unavailable", status: result.status };
}

function getRocketWebBaseUrl() {
  const explicit = cleanBaseUrl(process.env.NEXT_PUBLIC_WEB_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) return explicit;
  const vercelUrl = cleanBaseUrl(process.env.VERCEL_URL);
  if (!vercelUrl) return "";
  return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
}

function rocketStoreProductsUrl(options: { limit?: number; handle?: string } = {}) {
  const baseUrl = getRocketWebBaseUrl();
  if (!baseUrl) return null;
  const path = options.handle ? `/api/store/products/${encodeURIComponent(options.handle)}` : "/api/store/products";
  const url = new URL(path, baseUrl);
  url.searchParams.set("limit", String(options.limit || (options.handle ? 5 : 20)));
  return url;
}

export async function fetchRocketStoreProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  const url = rocketStoreProductsUrl(options);
  if (url) {
    try {
      const response = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      const products = extractStoreProducts(payload).map(normalizeServerStoreProduct).slice(0, options.limit || (options.handle ? 5 : 20));
      if (response.ok && products.length > 0) return { products, reason: null, status: response.status };
      if (response.ok && payload && typeof payload === "object" && (payload as Record<string, unknown>).success !== false) {
        return { products, reason: null, status: response.status };
      }
    } catch {
      // Fall back to direct Medusa store reads when the same-origin Rocket route is unavailable locally.
    }
  }

  const medusa = await fetchServerStoreProducts(options);
  if (medusa.products.length > 0 || medusa.reason === null) return medusa;

  const supabase = await fetchSupabaseStorefrontProducts(options);
  if (supabase.products.length > 0) return supabase;
  return medusa.reason ? medusa : supabase;
}

export function productCardProofAttributes(product: MedusaStoreProduct) {
  return {
    "data-product-handle": product.handle || "",
    "data-product-variant-id": productPrimaryVariantId(product),
  };
}
