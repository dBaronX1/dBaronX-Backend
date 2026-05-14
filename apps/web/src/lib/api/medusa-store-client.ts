import { getPublicEnv } from "@/lib/env";

export const FIRST_CJ_PRODUCT_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";

export type MedusaStoreProduct = Record<string, unknown> & {
  id?: string;
  title?: string;
  handle?: string;
  description?: string;
  thumbnail?: string;
  images?: { url?: string }[];
  variants?: (Record<string, unknown> & {
    id?: string;
    sku?: string;
    inventory_quantity?: number;
    stocked_quantity?: number;
    available_quantity?: number;
    manage_inventory?: boolean;
    prices?: { amount?: number; currency_code?: string }[];
    calculated_price?: Record<string, unknown>;
  })[];
  metadata?: Record<string, unknown>;
};

export type MedusaProductResult = {
  products: MedusaStoreProduct[];
  reason: string | null;
  status?: number;
};

function config() {
  const env = getPublicEnv();
  return {
    backendUrl: env.medusaBackendUrl,
    publishableKey: env.medusaPublishableKey,
  };
}

function medusaHeaders(): Record<string, string> {
  const { publishableKey } = config();
  return publishableKey ? { "x-publishable-api-key": publishableKey } : {};
}

function medusaStoreUrl(path: string, params?: Record<string, string | number>) {
  const { backendUrl } = config();
  if (!backendUrl) return null;
  const url = new URL(`${backendUrl}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
}

export async function fetchMedusaStoreProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  const internal = await fetchInternalStoreProducts(options);
  if (internal.products.length > 0 || internal.reason === null) return internal;

  const { backendUrl, publishableKey } = config();
  if (!backendUrl || !publishableKey) {
    return { products: [], reason: "products_unavailable" };
  }
  const url = medusaStoreUrl("/store/products", {
    limit: options.limit || 20,
    ...(options.handle ? { handle: options.handle } : {}),
  });
  if (!url) return { products: [], reason: "products_unavailable" };

  try {
    const response = await fetch(url, {
      headers: medusaHeaders(),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { products: [], reason: "products_unavailable", status: response.status };
    }
    return { products: extractProducts(payload), reason: null, status: response.status };
  } catch {
    return { products: [], reason: "products_unavailable" };
  }
}

async function fetchInternalStoreProducts(options: { limit?: number; handle?: string }): Promise<MedusaProductResult> {
  if (typeof window === "undefined") return { products: [], reason: "products_unavailable" };
  const path = options.handle ? `/api/store/products/${encodeURIComponent(options.handle)}` : "/api/store/products";
  try {
    const response = await fetch(path, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    const products = extractProducts(payload).slice(0, options.limit || 20);
    if (!response.ok) return { products: [], reason: "products_unavailable", status: response.status };
    const ok = payload && typeof payload === "object" ? (payload as Record<string, unknown>).success !== false : true;
    return { products, reason: ok ? null : "products_unavailable", status: response.status };
  } catch {
    return { products: [], reason: "products_unavailable" };
  }
}

export async function fetchMedusaStoreProductByHandle(handle: string) {
  const listing = await fetchMedusaStoreProducts({ handle, limit: 5 });
  const exact = listing.products.find((product) => String(product.handle || "") === handle);
  if (exact) return { product: exact, reason: null };
  if (listing.products[0]) return { product: listing.products[0], reason: null };
  return { product: null, reason: listing.reason || "medusa_store_product_not_visible_by_handle" };
}

export async function fetchFirstCjProduct() {
  return fetchMedusaStoreProductByHandle(FIRST_CJ_PRODUCT_HANDLE);
}

export function isVerifiedRealSupplierProduct(product: MedusaStoreProduct | null | undefined) {
  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  return Boolean(
    product &&
      metadata.demo === false &&
      metadata.realSupplierProduct === true &&
      metadata.supplierVerificationStatus === "verified_for_checkout" &&
      (metadata.supplier || metadata.supplierProductId || metadata.supplierSku || metadata.sourceUrl),
  );
}

export function productDisplayPrice(product: MedusaStoreProduct | null | undefined) {
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  const calculated = variant?.calculated_price;
  if (calculated && typeof calculated === "object") {
    const amount = Number((calculated as Record<string, unknown>).calculated_amount ?? (calculated as Record<string, unknown>).amount);
    const currency = String((calculated as Record<string, unknown>).currency_code ?? (calculated as Record<string, unknown>).currency ?? "usd");
    if (amount > 0) return formatMinor(amount, currency);
  }
  const price = Array.isArray(variant?.prices) ? variant?.prices?.find((item) => Number(item?.amount) > 0) : null;
  return price ? formatMinor(Number(price.amount), String(price.currency_code || "usd")) : "Price shown at checkout";
}

export function productPrimaryVariantId(product: MedusaStoreProduct | null | undefined) {
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  return typeof variant?.id === "string" ? variant.id : "";
}

export function productPrimaryImage(product: MedusaStoreProduct | null | undefined) {
  if (typeof product?.thumbnail === "string" && product.thumbnail) return product.thumbnail;
  const first = Array.isArray(product?.images) ? product.images.find((image) => image?.url) : null;
  return first?.url || "";
}

export function productAvailabilityLabel(product: MedusaStoreProduct | null | undefined) {
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  if (!variant) return "Variant not visible";
  if (variant.manage_inventory === false) return "Available";
  const quantity = Number(variant.available_quantity ?? variant.stocked_quantity ?? variant.inventory_quantity ?? 0);
  return quantity > 0 ? `Available (${quantity} in launch stock)` : "Availability pending";
}

export function productDeliveryEstimate(product: MedusaStoreProduct | null | undefined) {
  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  return String(metadata.deliveryEstimate || "Shown at checkout");
}

function extractProducts(data: unknown): MedusaStoreProduct[] {
  const payload = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const nested = payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : payload;
  for (const key of ["products", "items", "data"]) {
    const value = nested[key];
    if (Array.isArray(value)) return value.filter((item): item is MedusaStoreProduct => Boolean(item && typeof item === "object"));
  }
  const product = nested.product;
  return product && typeof product === "object" ? [product as MedusaStoreProduct] : [];
}

function formatMinor(amount: number, currency: string) {
  const normalizedAmount = amount > 0 && amount < 1000 && !Number.isInteger(amount) ? amount : amount / 100;
  return `${normalizedAmount.toFixed(2)} ${currency.toUpperCase()}`;
}
