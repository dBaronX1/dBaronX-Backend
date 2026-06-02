import { getPublicEnv } from "@/lib/env";
import { firstMedusaPriceMinor, firstMedusaVariantId } from "@/lib/medusa-product-utils";

export type StoreProductVariant = Record<string, unknown> & {
  id?: string;
  productId?: string;
  variantId?: string;
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
  productId?: string;
  variantId?: string;
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
  checkoutEnabled?: boolean;
  variants?: StoreProductVariant[];
  stockStatus?: string;
  inventoryQuantity?: number;
  supplier?: string;
  supplierProductId?: string;
  supplierSku?: string;
  category?: string;
  deliveryEstimate?: string;
  realSupplierProduct?: boolean;
  manualCurated?: boolean;
  buyable?: boolean;
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

function apiCatalogUrl(options: { limit?: number; handle?: string } = {}) {
  const env = getPublicEnv();
  const base = env.apiBaseUrl;
  const fallbackPath = options.handle ? `/api/store/products/${encodeURIComponent(options.handle)}` : "/api/store/products";
  if (!base) {
    const params = new URLSearchParams({ limit: String(options.limit || (options.handle ? 5 : 20)) });
    return `${fallbackPath}?${params.toString()}`;
  }
  const path = options.handle ? `/api/catalog/products/${encodeURIComponent(options.handle)}` : "/api/catalog/products";
  const url = new URL(path, base);
  if (!options.handle) url.searchParams.set("limit", String(options.limit || 20));
  return url.toString();
}

export async function fetchApiCatalogProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  const attemptedEndpoint = apiCatalogUrl(options);

  try {
    const response = await fetch(attemptedEndpoint, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);
    const products = extractProducts(payload).map(normalizeStoreProduct).slice(0, options.limit || (options.handle ? 5 : 20));
    if (!response.ok) return { products: [], reason: "products_unavailable", status: response.status, attemptedEndpoint };

    const ok = payload && typeof payload === "object" ? (payload as Record<string, unknown>).success !== false : true;
    return { products, reason: ok ? null : "products_unavailable", status: response.status, attemptedEndpoint };
  } catch {
    return { products: [], reason: "products_unavailable", attemptedEndpoint };
  }
}

export async function fetchApiCatalogProductByHandle(handle: string) {
  const listing = await fetchApiCatalogProducts({ handle, limit: 5 });
  const exact = listing.products.find((product) => String(product.handle || "") === handle);
  if (exact) return { product: exact, reason: null };
  if (listing.products[0]) return { product: listing.products[0], reason: null };
  return { product: null, reason: listing.reason || "products_unavailable" };
}

export async function fetchFirstStoreProduct() {
  const listing = await fetchApiCatalogProducts({ limit: 1 });
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
  if (typeof product?.variantId === "string" && product.variantId.trim()) return product.variantId.trim();
  return firstMedusaVariantId(product);
}

export function productPrimaryImage(product: MedusaStoreProduct | null | undefined) {
  const explicit = (product as Record<string, unknown> | null | undefined)?.imageUrl;
  if (typeof explicit === "string" && explicit) return explicit;
  if (typeof product?.image_url === "string" && product.image_url) return product.image_url;
  if (typeof product?.image === "string" && product.image) return product.image;
  const first = Array.isArray(product?.images) ? product.images.find((image) => image?.url) : null;
  if (first?.url) return first.url;
  if (typeof product?.thumbnail === "string" && product.thumbnail) return product.thumbnail;
  return "";
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
  const rawVariantId = publicString(safe.variantId ?? (safe as Record<string, unknown>).variant_id);
  const variants = normalizeVariants(Array.isArray(safe.variants) ? safe.variants : []);
  const variantsWithFlatFallback = variants.length || !rawVariantId ? variants : [{ id: rawVariantId, prices: [] }];
  const checkoutEnabled = safe.checkoutEnabled === false || safe.buyable === false ? false : undefined;
  const defaultVariantId = productPrimaryVariantId({ ...safe, defaultVariantId: safe.defaultVariantId || rawVariantId, variants: variantsWithFlatFallback, checkoutEnabled });
  const priceInfo = resolvePriceInfo({ ...safe, variants: variantsWithFlatFallback });
  const image = productPrimaryImage({ ...safe, variants: variantsWithFlatFallback });
  const metadata = sanitizeMetadata(safe.metadata);
  const inventoryQuantity = resolveInventoryQuantity({ ...safe, variants: variantsWithFlatFallback });
  const productId = publicString(safe.productId ?? (safe as Record<string, unknown>).product_id ?? safe.id);
  const supplier = publicString(metadata.supplier ?? safe.supplier);
  const supplierProductId = publicString(metadata.supplierProductId ?? metadata.supplier_product_id ?? safe.supplierProductId);
  const supplierSku = publicString(metadata.supplierSku ?? metadata.supplier_sku ?? safe.supplierSku ?? variantsWithFlatFallback[0]?.sku);
  const category = publicString(metadata.category ?? metadata.categoryLabel ?? safe.category);
  const deliveryEstimate = publicString(metadata.deliveryEstimate ?? metadata.delivery_estimate ?? safe.deliveryEstimate);

  return {
    id: productId,
    productId,
    variantId: defaultVariantId,
    title: publicString(safe.title ?? safe.name) || "dBaronX product",
    name: publicString(safe.name ?? safe.title) || "dBaronX product",
    handle: publicString(safe.handle),
    description: publicString(safe.description),
    imageUrl: image,
    thumbnail: publicString(safe.thumbnail ?? image),
    image,
    image_url: image,
    price: priceInfo.price,
    priceMinor: priceInfo.priceMinor,
    priceFormatted: priceInfo.priceFormatted,
    currencyCode: priceInfo.currencyCode,
    defaultVariantId,
    ...(checkoutEnabled === false ? { checkoutEnabled } : {}),
    variants: variantsWithFlatFallback,
    stockStatus: inventoryQuantity === null ? (variantsWithFlatFallback[0]?.manage_inventory === false || safe.buyable === true ? "Available" : "Availability pending") : inventoryQuantity > 0 ? `Available (${inventoryQuantity} in launch stock)` : "Availability pending",
    ...(inventoryQuantity !== null ? { inventoryQuantity } : {}),
    ...(supplier ? { supplier } : {}),
    ...(supplierProductId ? { supplierProductId } : {}),
    ...(supplierSku ? { supplierSku } : {}),
    ...(category ? { category } : {}),
    ...(typeof safe.realSupplierProduct === "boolean" ? { realSupplierProduct: safe.realSupplierProduct } : {}),
    ...(typeof safe.manualCurated === "boolean" ? { manualCurated: safe.manualCurated } : {}),
    ...(typeof safe.buyable === "boolean" ? { buyable: safe.buyable } : {}),
    ...(deliveryEstimate ? { deliveryEstimate } : {}),
    productUrl: safe.handle ? `/products/${safe.handle}` : "/products",
    metadata,
  };
}

function normalizeVariants(variants: StoreProductVariant[]): StoreProductVariant[] {
  return variants.map((variant) => {
    const safe = stripInternalFields(variant) as StoreProductVariant;
    return {
      id: publicString(safe.id),
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
  const resolved = firstMedusaPriceMinor(product);
  return resolved.amount
    ? { price: resolved.amount / 100, priceMinor: resolved.amount, priceFormatted: formatMinor(resolved.amount, resolved.currencyCode), currencyCode: resolved.currencyCode.toUpperCase() }
    : { price: undefined, priceMinor: undefined, priceFormatted: "Price shown at checkout", currencyCode: resolved.currencyCode.toUpperCase() };
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

export const fetchMedusaStoreProducts = fetchApiCatalogProducts;
export const fetchMedusaStoreProductByHandle = fetchApiCatalogProductByHandle;
