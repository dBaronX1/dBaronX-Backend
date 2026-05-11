const MEDUSA_BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || process.env.MEDUSA_BASE_URL || process.env.MEDUSA_URL;
const MEDUSA_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || process.env.MEDUSA_PUBLISHABLE_KEY;

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
    prices?: { amount?: number; currency_code?: string }[];
    calculated_price?: Record<string, unknown>;
  })[];
  metadata?: Record<string, unknown>;
};

function medusaHeaders() {
  const headers: Record<string, string> = {};
  if (MEDUSA_PUBLISHABLE_KEY) headers["x-publishable-api-key"] = MEDUSA_PUBLISHABLE_KEY;
  return headers;
}

function medusaStoreUrl(path: string, params?: Record<string, string | number>) {
  if (!MEDUSA_BACKEND_URL) return null;
  const url = new URL(`${MEDUSA_BACKEND_URL.replace(/\/$/, "")}${path}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
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

export async function fetchMedusaStoreProducts(options: { limit?: number; handle?: string } = {}) {
  if (!MEDUSA_BACKEND_URL || !MEDUSA_PUBLISHABLE_KEY) {
    return { products: [] as MedusaStoreProduct[], reason: "medusa_env_missing" };
  }

  const url = medusaStoreUrl("/store/products", {
    limit: options.limit || 20,
    ...(options.handle ? { handle: options.handle } : {}),
  });
  if (!url) return { products: [] as MedusaStoreProduct[], reason: "medusa_env_missing" };

  const response = await fetch(url, {
    headers: medusaHeaders(),
    next: { revalidate: 60 },
  });

  if (!response.ok) return { products: [] as MedusaStoreProduct[], reason: `medusa_store_products_failed_${response.status}` };
  const data = await response.json();
  return { products: extractProducts(data), reason: null };
}

export async function fetchMedusaStoreProductByHandle(handle: string) {
  const listing = await fetchMedusaStoreProducts({ handle, limit: 5 });
  const exact = listing.products.find((product) => String(product.handle || "") === handle);
  if (exact) return { product: exact, reason: null };
  if (listing.products[0]) return { product: listing.products[0], reason: null };
  return { product: null, reason: listing.reason };
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

export function productPrimaryImage(product: MedusaStoreProduct | null | undefined) {
  if (typeof product?.thumbnail === "string" && product.thumbnail) return product.thumbnail;
  const first = Array.isArray(product?.images) ? product.images.find((image) => image?.url) : null;
  return first?.url || "";
}

function formatMinor(amount: number, currency: string) {
  return `${currency.toUpperCase()} ${(amount / 100).toFixed(2)}`;
}
