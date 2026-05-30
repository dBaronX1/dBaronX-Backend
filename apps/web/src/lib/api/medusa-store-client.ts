import { getPublicEnv } from "@/lib/env";

export type StoreProductVariant = Record<string, unknown> & {
  id?: string;
  title?: string;
  sku?: string;
  inventory_quantity?: number;
  stocked_quantity?: number;
  available_quantity?: number;
  manage_inventory?: boolean;
  prices?: { amount?: number; currency_code?: string }[];
  calculated_price?: Record<string, unknown>;
};

export type MedusaStoreProduct = Record<string, unknown> & {
  id?: string;
  title?: string;
  name?: string;
  handle?: string;
  description?: string;
  thumbnail?: string;
  image?: string;
  image_url?: string;
  images?: { url?: string }[];
  price?: number | string;
  priceMinor?: number;
  priceFormatted?: string;
  currencyCode?: string;
  defaultVariantId?: string;
  variantId?: string;
  productId?: string;
  category?: string;
  inventoryStatus?: string;
  inStock?: boolean;
  buyable?: boolean;
  checkoutEnabled?: boolean;
  variants?: StoreProductVariant[];
  stockStatus?: string;
  inventoryQuantity?: number;
  supplier?: string;
  supplierProductId?: string;
  supplierSku?: string;
  deliveryEstimate?: string;
  productUrl?: string;
  metadata?: Record<string, unknown>;
};

export type MedusaProductResult = {
  products: MedusaStoreProduct[];
  reason: string | null;
  status?: number;
  attemptedEndpoint?: string;
};

const SECRET_FIELD_PATTERN = /(secret|token|password|api[_-]?key|publishable[_-]?key|service[_-]?role|webhook|database[_-]?url|admin)/i;

function apiBaseUrl() {
  const env = getPublicEnv();
  return (env.apiBaseUrl || "https://dbaronx-api-unified-qo2j.onrender.com").trim().replace(/\/+$/, "");
}

function apiCatalogUrl(path: string, params?: Record<string, string | number>) {
  const baseUrl = apiBaseUrl();
  if (!baseUrl) return null;
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  Object.entries(params || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  return url;
}

export async function fetchMedusaStoreProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  const internal = await fetchInternalStoreProducts(options);
  if (internal.products.length > 0 || internal.reason === null) return internal;

  const path = options.handle ? `/api/catalog/products/${encodeURIComponent(options.handle)}` : "/api/catalog/products";
  const url = apiCatalogUrl(path, options.handle ? undefined : { limit: options.limit || 20 });
  if (!url) {
    return { products: [], reason: "products_unavailable", attemptedEndpoint: path };
  }

  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return { products: [], reason: "products_unavailable", status: response.status, attemptedEndpoint: url.toString() };
    }
    return { products: extractProducts(payload).map(normalizeStoreProduct), reason: null, status: response.status, attemptedEndpoint: url.toString() };
  } catch {
    return { products: [], reason: "products_unavailable", attemptedEndpoint: url.toString() };
  }
}

async function fetchInternalStoreProducts(options: { limit?: number; handle?: string }): Promise<MedusaProductResult> {
  if (typeof window === "undefined") return { products: [], reason: "products_unavailable" };
  const params = new URLSearchParams();
  params.set("limit", String(options.limit || 20));
  if (options.handle) params.set("handle", options.handle);
  const path = options.handle ? `/api/store/products/${encodeURIComponent(options.handle)}?${params}` : `/api/store/products?${params}`;
  try {
    const attemptedEndpoint = path;
    const response = await fetch(path, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    const products = extractProducts(payload).map(normalizeStoreProduct).slice(0, options.limit || 20);
    if (!response.ok) return { products: [], reason: "products_unavailable", status: response.status, attemptedEndpoint };
    const ok = payload && typeof payload === "object" ? (payload as Record<string, unknown>).success !== false : true;
    return { products, reason: ok ? null : "products_unavailable", status: response.status, attemptedEndpoint };
  } catch {
    return { products: [], reason: "products_unavailable", attemptedEndpoint: path };
  }
}

export async function fetchMedusaStoreProductByHandle(handle: string) {
  const listing = await fetchMedusaStoreProducts({ handle, limit: 5 });
  const exact = listing.products.find((product) => String(product.handle || "") === handle);
  if (exact) return { product: exact, reason: null };
  if (listing.products[0]) return { product: listing.products[0], reason: null };
  return { product: null, reason: listing.reason || "products_unavailable" };
}

export async function fetchFirstStoreProduct() {
  const listing = await fetchMedusaStoreProducts({ limit: 1 });
  if (listing.products[0]) return { product: listing.products[0], reason: null };
  return { product: null, reason: listing.reason || "products_unavailable" };
}

export function isVerifiedRealSupplierProduct(product: MedusaStoreProduct | null | undefined) {
  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  return Boolean(
    product &&
      metadata.demo === false &&
      (metadata.realSupplierProduct === true || metadata.supplierVerificationStatus === "verified_for_checkout" || product.supplier || product.supplierProductId || product.supplierSku),
  );
}

export function productDisplayPrice(product: MedusaStoreProduct | null | undefined) {
  if (product?.priceFormatted) return product.priceFormatted;
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  const calculated = variant?.calculated_price;
  if (calculated && typeof calculated === "object") {
    const amount = Number((calculated as Record<string, unknown>).calculated_amount ?? (calculated as Record<string, unknown>).amount);
    const currency = String((calculated as Record<string, unknown>).currency_code ?? (calculated as Record<string, unknown>).currency ?? product?.currencyCode ?? "usd");
    if (amount > 0) return formatMinor(amount, currency);
  }
  const price = Array.isArray(variant?.prices) ? variant?.prices?.find((item) => Number(item?.amount) > 0) : null;
  return price ? formatMinor(Number(price.amount), String(price.currency_code || product?.currencyCode || "usd")) : "Price shown at checkout";
}

export function productPrimaryVariantId(product: MedusaStoreProduct | null | undefined) {
  if (product?.checkoutEnabled === false) return "";
  if (typeof product?.defaultVariantId === "string" && product.defaultVariantId) return product.defaultVariantId;
  if (typeof product?.variantId === "string" && product.variantId) return product.variantId;
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  return typeof variant?.id === "string" ? variant.id : "";
}

export function productPrimaryImage(product: MedusaStoreProduct | null | undefined) {
  if (typeof product?.thumbnail === "string" && product.thumbnail) return product.thumbnail;
  if (typeof product?.image === "string" && product.image) return product.image;
  if (typeof product?.image_url === "string" && product.image_url) return product.image_url;
  const first = Array.isArray(product?.images) ? product.images.find((image) => image?.url) : null;
  return first?.url || "";
}

export function productAvailabilityLabel(product: MedusaStoreProduct | null | undefined) {
  if (product?.checkoutEnabled === false) return "Unavailable for checkout";
  if (product?.stockStatus) return product.stockStatus;
  const variant = Array.isArray(product?.variants) ? product?.variants?.[0] : null;
  if (!variant) return "Variant pending";
  if (variant.manage_inventory === false) return "Available";
  const quantity = Number(product?.inventoryQuantity ?? variant.available_quantity ?? variant.stocked_quantity ?? variant.inventory_quantity ?? 0);
  return quantity > 0 ? `Available (${quantity} in launch stock)` : "Availability pending";
}

export function productDeliveryEstimate(product: MedusaStoreProduct | null | undefined) {
  if (typeof product?.deliveryEstimate === "string" && product.deliveryEstimate) return product.deliveryEstimate;
  const metadata = product?.metadata && typeof product.metadata === "object" ? product.metadata : {};
  return String(metadata.deliveryEstimate || "Shown at checkout");
}

export function normalizeStoreProduct(product: MedusaStoreProduct): MedusaStoreProduct {
  const safe = stripInternalFields(product) as MedusaStoreProduct;
  const apiVariantId = publicString(safe.variantId);
  const apiPriceMinor = safeNumber(safe.priceMinor);
  const apiCurrencyCode = publicString(safe.currencyCode || "usd").toLowerCase() || "usd";
  const variants = normalizeVariants(Array.isArray(safe.variants) ? safe.variants : []);
  const normalizedVariants = variants.length > 0 ? variants : apiVariantId ? [{ id: apiVariantId, prices: apiPriceMinor ? [{ amount: apiPriceMinor, currency_code: apiCurrencyCode }] : [] }] : [];
  const checkoutEnabled = safe.checkoutEnabled === false || safe.buyable === false ? false : undefined;
  const defaultVariantId = apiVariantId || productPrimaryVariantId({ ...safe, variants: normalizedVariants, checkoutEnabled });
  const priceInfo = apiPriceMinor && apiPriceMinor > 0
    ? { price: apiPriceMinor / 100, priceMinor: apiPriceMinor, priceFormatted: formatMinor(apiPriceMinor, apiCurrencyCode), currencyCode: apiCurrencyCode.toUpperCase() }
    : resolvePriceInfo({ ...safe, variants: normalizedVariants });
  const image = productPrimaryImage({ ...safe, variants: normalizedVariants });
  const metadata = sanitizeMetadata(safe.metadata);
  const inventoryQuantity = resolveInventoryQuantity({ ...safe, variants: normalizedVariants });
  const supplier = publicString(metadata.supplier ?? safe.supplier);
  const supplierProductId = publicString(metadata.supplierProductId ?? metadata.supplier_product_id ?? safe.supplierProductId);
  const supplierSku = publicString(metadata.supplierSku ?? metadata.supplier_sku ?? safe.supplierSku ?? normalizedVariants[0]?.sku);
  const deliveryEstimate = publicString(metadata.deliveryEstimate ?? metadata.delivery_estimate ?? safe.deliveryEstimate);

  return {
    id: publicString(safe.id || safe.productId),
    title: publicString(safe.title ?? safe.name) || "dBaronX product",
    name: publicString(safe.name ?? safe.title) || "dBaronX product",
    handle: publicString(safe.handle),
    description: publicString(safe.description),
    thumbnail: publicString(safe.thumbnail ?? image),
    image,
    image_url: image,
    price: priceInfo.price,
    priceMinor: priceInfo.priceMinor,
    priceFormatted: priceInfo.priceFormatted,
    currencyCode: priceInfo.currencyCode,
    defaultVariantId,
    variantId: defaultVariantId,
    productId: publicString(safe.productId || safe.id),
    ...(safe.category ? { category: publicString(safe.category) } : {}),
    ...(safe.inventoryStatus ? { inventoryStatus: publicString(safe.inventoryStatus) } : {}),
    ...(typeof safe.inStock === "boolean" ? { inStock: safe.inStock } : {}),
    ...(typeof safe.buyable === "boolean" ? { buyable: safe.buyable } : {}),
    ...(checkoutEnabled === false ? { checkoutEnabled } : {}),
    variants: normalizedVariants,
    stockStatus: publicString(safe.inventoryStatus || safe.stockStatus) || (inventoryQuantity === null ? (normalizedVariants[0]?.manage_inventory === false ? "Available" : "Availability pending") : inventoryQuantity > 0 ? `Available (${inventoryQuantity} in launch stock)` : "Availability pending"),
    ...(inventoryQuantity !== null ? { inventoryQuantity } : {}),
    ...(supplier ? { supplier } : {}),
    ...(supplierProductId ? { supplierProductId } : {}),
    ...(supplierSku ? { supplierSku } : {}),
    ...(deliveryEstimate ? { deliveryEstimate } : {}),
    productUrl: safe.handle ? `/products/${safe.handle}` : "/products",
    metadata,
  };
}

function normalizeVariants(variants: StoreProductVariant[]): StoreProductVariant[] {
  return variants.map((variant) => {
    const safe = stripInternalFields(variant) as StoreProductVariant;
    return {
      id: publicString(safe.id || safe.productId),
      title: publicString(safe.title),
      sku: publicString(safe.sku),
      manage_inventory: typeof safe.manage_inventory === "boolean" ? safe.manage_inventory : undefined,
      inventory_quantity: safeNumber(safe.inventory_quantity),
      stocked_quantity: safeNumber(safe.stocked_quantity),
      available_quantity: safeNumber(safe.available_quantity),
      prices: Array.isArray(safe.prices)
        ? safe.prices.map((price) => ({ amount: safeNumber(price?.amount), currency_code: publicString(price?.currency_code || "usd") })).filter((price) => Number(price.amount) > 0)
        : [],
      calculated_price: safe.calculated_price && typeof safe.calculated_price === "object" ? (stripInternalFields(safe.calculated_price) as Record<string, unknown>) : undefined,
    };
  });
}

function resolvePriceInfo(product: MedusaStoreProduct) {
  const variant = Array.isArray(product.variants) ? product.variants[0] : null;
  const calculated = variant?.calculated_price;
  if (calculated && typeof calculated === "object") {
    const amount = Number((calculated as Record<string, unknown>).calculated_amount ?? (calculated as Record<string, unknown>).amount);
    const currency = String((calculated as Record<string, unknown>).currency_code ?? (calculated as Record<string, unknown>).currency ?? "usd").toLowerCase();
    if (amount > 0) return { price: amount / 100, priceMinor: amount, priceFormatted: formatMinor(amount, currency), currencyCode: currency.toUpperCase() };
  }
  const price = Array.isArray(variant?.prices) ? variant.prices.find((item) => Number(item?.amount) > 0) : null;
  const amount = Number(price?.amount ?? 0);
  const currency = String(price?.currency_code || "usd").toLowerCase();
  return amount > 0
    ? { price: amount / 100, priceMinor: amount, priceFormatted: formatMinor(amount, currency), currencyCode: currency.toUpperCase() }
    : { price: undefined, priceMinor: undefined, priceFormatted: "Price shown at checkout", currencyCode: currency.toUpperCase() };
}

function resolveInventoryQuantity(product: MedusaStoreProduct) {
  if (typeof product.inventoryQuantity === "number" && Number.isFinite(product.inventoryQuantity)) return product.inventoryQuantity;
  const variant = Array.isArray(product.variants) ? product.variants[0] : null;
  const quantity = safeNumber(variant?.available_quantity ?? variant?.stocked_quantity ?? variant?.inventory_quantity);
  return typeof quantity === "number" ? quantity : null;
}

function sanitizeMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  return stripInternalFields(metadata) as Record<string, unknown>;
}

function stripInternalFields(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripInternalFields);
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (SECRET_FIELD_PATTERN.test(key)) continue;
    if (["sales_channels", "categories", "collection", "type", "options"].includes(key)) continue;
    output[key] = item && typeof item === "object" ? stripInternalFields(item) : item;
  }
  return output;
}

function publicString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
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
