import { createClient } from "@supabase/supabase-js";

import { normalizeStoreProduct, type MedusaProductResult, type MedusaStoreProduct } from "@/lib/api/medusa-store-client";

export type SupabaseStorefrontProductRow = {
  id?: string;
  source?: string | null;
  supplier?: string | null;
  supplier_product_id?: string | null;
  supplier_sku?: string | null;
  medusa_product_id?: string | null;
  medusa_variant_id?: string | null;
  handle?: string | null;
  title?: string | null;
  description?: string | null;
  short_description?: string | null;
  thumbnail?: string | null;
  image_url?: string | null;
  images?: unknown;
  price_minor?: number | null;
  compare_at_price_minor?: number | null;
  currency_code?: string | null;
  inventory_quantity?: number | null;
  stock_status?: string | null;
  delivery_estimate?: string | null;
  shipping_country?: string | null;
  category?: string | null;
  tags?: string[] | null;
  metadata?: Record<string, unknown> | null;
  verification_status?: string | null;
  active?: boolean | null;
  checkout_enabled?: boolean | null;
};

const STOREFRONT_SELECT = [
  "id",
  "source",
  "supplier",
  "supplier_product_id",
  "supplier_sku",
  "medusa_product_id",
  "medusa_variant_id",
  "handle",
  "title",
  "description",
  "short_description",
  "thumbnail",
  "image_url",
  "images",
  "price_minor",
  "compare_at_price_minor",
  "currency_code",
  "inventory_quantity",
  "stock_status",
  "delivery_estimate",
  "shipping_country",
  "category",
  "tags",
  "metadata",
  "verification_status",
  "active",
  "checkout_enabled",
].join(",");

const SECRET_FIELD_PATTERN = /(secret|token|password|api[_-]?key|publishable[_-]?key|service[_-]?role|webhook|database[_-]?url|admin|stripe|telegram|cj[_-]?raw)/i;

function clean(value: string | undefined) {
  return (value || "").trim();
}

function publicString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function publicNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function publicImages(value: unknown) {
  const items = Array.isArray(value) ? value : [];
  return items.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function sanitizePublicMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (SECRET_FIELD_PATTERN.test(key)) continue;
    if (["string", "number", "boolean"].includes(typeof value) || value === null) out[key] = value;
  }
  return out;
}

export function formatStorefrontPrice(priceMinor?: number | null, currencyCode?: string | null) {
  const amount = Number(priceMinor);
  const currency = publicString(currencyCode || "usd").toUpperCase() || "USD";
  if (!Number.isFinite(amount) || amount <= 0) return "Contact support";
  return `${(amount / 100).toFixed(2)} ${currency}`;
}

export function normalizeSupabaseStorefrontProduct(row: SupabaseStorefrontProductRow): MedusaStoreProduct {
  const images = publicImages(row.images);
  const thumbnail = publicString(row.thumbnail) || publicString(row.image_url) || images[0] || "";
  const medusaVariantId = publicString(row.medusa_variant_id);
  const checkoutEnabled = row.checkout_enabled === true && Boolean(medusaVariantId);
  const priceMinor = publicNumber(row.price_minor);
  const currencyCode = publicString(row.currency_code || "usd") || "usd";
  const title = publicString(row.title) || "dBaronX product";
  const handle = publicString(row.handle);
  const product = normalizeStoreProduct({
    id: publicString(row.medusa_product_id) || publicString(row.id),
    title,
    name: title,
    handle,
    description: publicString(row.description) || publicString(row.short_description),
    thumbnail,
    image: thumbnail,
    image_url: thumbnail,
    images: images.map((url) => ({ url })),
    price: priceMinor ? priceMinor / 100 : undefined,
    priceMinor,
    priceFormatted: formatStorefrontPrice(priceMinor, currencyCode),
    currencyCode: currencyCode.toUpperCase(),
    defaultVariantId: checkoutEnabled ? medusaVariantId : "",
    variants: checkoutEnabled ? [{ id: medusaVariantId, prices: priceMinor ? [{ amount: priceMinor, currency_code: currencyCode }] : [] }] : [],
    checkoutEnabled,
    stockStatus: publicString(row.stock_status) || "unknown",
    inventoryQuantity: typeof row.inventory_quantity === "number" ? row.inventory_quantity : undefined,
    supplier: publicString(row.supplier),
    supplierProductId: publicString(row.supplier_product_id),
    supplierSku: publicString(row.supplier_sku),
    deliveryEstimate: publicString(row.delivery_estimate),
    productUrl: handle ? `/products/${handle}` : "/products",
    metadata: {
      ...sanitizePublicMetadata(row.metadata),
      storefrontSource: "supabase_storefront_products",
      verificationStatus: "verified",
      checkoutSafety: checkoutEnabled ? "medusa_variant_present" : "checkout_unavailable_no_medusa_variant",
    },
  });
  product.checkoutEnabled = checkoutEnabled;
  product.defaultVariantId = checkoutEnabled ? medusaVariantId : "";
  return product;
}

function supabaseConfig() {
  return {
    supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

export function hasSupabaseStorefrontConfig() {
  const { supabaseUrl, supabaseAnonKey } = supabaseConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function createStorefrontClient() {
  const { supabaseUrl, supabaseAnonKey } = supabaseConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export async function fetchSupabaseStorefrontProducts(options: { limit?: number; handle?: string } = {}): Promise<MedusaProductResult> {
  const supabase = createStorefrontClient();
  if (!supabase) return { products: [], reason: "supabase_storefront_env_missing" };

  let query = supabase
    .schema("app_public")
    .from("storefront_products")
    .select(STOREFRONT_SELECT)
    .eq("active", true)
    .eq("verification_status", "verified")
    .order("updated_at", { ascending: false })
    .limit(options.limit || 24);

  if (options.handle) query = query.eq("handle", options.handle).limit(options.limit || 5);

  const { data, error, status } = await query;
  if (error) return { products: [], reason: error.message || "supabase_storefront_unavailable", status };

  return {
    products: (data || []).map((row) => normalizeSupabaseStorefrontProduct(row as SupabaseStorefrontProductRow)),
    reason: null,
    status,
  };
}

export async function fetchSupabaseStorefrontProductByHandle(handle: string) {
  const result = await fetchSupabaseStorefrontProducts({ handle, limit: 5 });
  const product = result.products.find((item) => item.handle === handle) || result.products[0] || null;
  return { product, reason: product ? null : result.reason || "supabase_storefront_product_unavailable", status: result.status };
}
