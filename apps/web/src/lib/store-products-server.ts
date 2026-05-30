import { nestApiRequest } from "@/server/api/nest-api.client";
import {
  normalizeStoreProduct,
  productPrimaryVariantId,
  type MedusaProductResult,
  type MedusaStoreProduct,
} from "@/lib/api/medusa-store-client";

type StorefrontProductsPayload = {
  success?: boolean;
  product?: unknown;
  products?: unknown[];
  message?: string;
};

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

function storefrontPath(options: { limit?: number; handle?: string } = {}) {
  const handle = options.handle?.trim();
  const limit = String(options.limit || (handle ? 5 : 20));
  const params = new URLSearchParams({ limit });
  return handle ? `/api/storefront/products/${encodeURIComponent(handle)}?${params.toString()}` : `/api/storefront/products?${params.toString()}`;
}

export async function fetchServerStoreProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  try {
    const response = await nestApiRequest<StorefrontProductsPayload>({ path: storefrontPath(options) });
    if (!response.ok) return { products: [], reason: "products_unavailable", status: response.status };

    const products = extractStoreProducts(response.data).map(normalizeServerStoreProduct);
    return {
      products,
      reason: response.data?.success === false ? response.data.message || "products_unavailable" : null,
      status: response.status,
    };
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
  const explicit = (process.env.NEXT_PUBLIC_WEB_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/+$/, "");
  if (explicit) return explicit;
  const vercelUrl = (process.env.VERCEL_URL || "").trim().replace(/\/+$/, "");
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
  if (!url) return fetchServerStoreProducts(options);

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    const products = extractStoreProducts(payload).map(normalizeServerStoreProduct).slice(0, options.limit || (options.handle ? 5 : 20));
    if (response.ok && (products.length > 0 || (payload && typeof payload === "object" && (payload as Record<string, unknown>).success !== false))) {
      return { products, reason: null, status: response.status };
    }
    return { products, reason: "products_unavailable", status: response.status };
  } catch {
    return fetchServerStoreProducts(options);
  }
}

export function productCardProofAttributes(product: MedusaStoreProduct) {
  return {
    "data-product-handle": product.handle || "",
    "data-product-variant-id": productPrimaryVariantId(product),
  };
}
