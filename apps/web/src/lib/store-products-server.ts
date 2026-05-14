import {
  FIRST_CJ_PRODUCT_HANDLE,
  productPrimaryVariantId,
  type MedusaProductResult,
  type MedusaStoreProduct,
} from "@/lib/api/medusa-store-client";

function cleanBaseUrl(value: string | undefined) {
  return (value || "").trim().replace(/\/+$/, "");
}

export function getMedusaStoreServerConfig() {
  return {
    backendUrl: cleanBaseUrl(process.env.MEDUSA_BASE_URL || process.env.MEDUSA_BACKEND_URL || process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL),
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

function sanitizeProduct(product: MedusaStoreProduct): MedusaStoreProduct {
  return {
    ...product,
    title: product.title || "dBaronX product",
    handle: product.handle || "",
    variants: Array.isArray(product.variants)
      ? product.variants.map((variant) => ({
          ...variant,
          id: typeof variant.id === "string" ? variant.id : "",
        }))
      : [],
  };
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
    const products = extractStoreProducts(payload).map(sanitizeProduct);
    return { products, reason: null, status: response.status };
  } catch {
    return { products: [], reason: "products_unavailable" };
  }
}

export async function fetchServerStoreProductByHandle(handle = FIRST_CJ_PRODUCT_HANDLE) {
  const result = await fetchServerStoreProducts({ handle, limit: 5 });
  const product = result.products.find((item) => item.handle === handle) || result.products[0] || null;
  return { product, reason: product ? null : result.reason || "products_unavailable", status: result.status };
}

export function productCardProofAttributes(product: MedusaStoreProduct) {
  return {
    "data-product-handle": product.handle || "",
    "data-product-variant-id": productPrimaryVariantId(product),
  };
}
