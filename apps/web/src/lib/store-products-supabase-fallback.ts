import { createClient } from "@supabase/supabase-js";

import { normalizeServerStoreProduct } from "@/lib/store-products-server";
import type { MedusaStoreProduct } from "@/lib/api/medusa-store-client";

type StorefrontProductCacheRow = {
  id?: string;
  medusa_product_id?: string | null;
  handle?: string | null;
  title?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  image_url?: string | null;
  price_minor?: number | null;
  currency_code?: string | null;
  default_variant_id?: string | null;
  supplier?: string | null;
  supplier_product_id?: string | null;
  supplier_sku?: string | null;
  delivery_estimate?: string | null;
  metadata?: Record<string, unknown> | null;
};

const SECRET_FIELD_PATTERN = /(secret|token|password|api[_-]?key|publishable[_-]?key|service[_-]?role|webhook|database[_-]?url|admin|stripe|telegram|cj)/i;

function clean(value: string | undefined) {
  return (value || "").trim();
}

function publicString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

function formatPrice(priceMinor?: number | null, currencyCode?: string | null) {
  if (!Number.isFinite(Number(priceMinor)) || Number(priceMinor) <= 0) return undefined;
  return `${(Number(priceMinor) / 100).toFixed(2)} ${publicString(currencyCode || "usd").toUpperCase()}`;
}

function fallbackClientConfig() {
  return {
    supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}

function rowToProduct(row: StorefrontProductCacheRow): MedusaStoreProduct {
  const metadata = sanitizePublicMetadata(row.metadata);
  const defaultVariantId = publicString(row.default_variant_id);
  return normalizeServerStoreProduct({
    id: publicString(row.medusa_product_id) || publicString(row.id),
    title: publicString(row.title) || "dBaronX product",
    name: publicString(row.title) || "dBaronX product",
    handle: publicString(row.handle),
    description: publicString(row.description),
    thumbnail: publicString(row.thumbnail) || publicString(row.image_url),
    image: publicString(row.image_url) || publicString(row.thumbnail),
    image_url: publicString(row.image_url) || publicString(row.thumbnail),
    price: row.price_minor || undefined,
    priceMinor: row.price_minor || undefined,
    priceFormatted: formatPrice(row.price_minor, row.currency_code),
    currencyCode: publicString(row.currency_code) || "usd",
    defaultVariantId,
    variants: defaultVariantId ? [{ id: defaultVariantId, prices: row.price_minor ? [{ amount: row.price_minor, currency_code: publicString(row.currency_code) || "usd" }] : [] }] : [],
    stockStatus: defaultVariantId ? "Checkout available" : "Currently unavailable for checkout",
    supplier: publicString(row.supplier),
    supplierProductId: publicString(row.supplier_product_id),
    supplierSku: publicString(row.supplier_sku),
    deliveryEstimate: publicString(row.delivery_estimate),
    metadata: {
      ...metadata,
      storefrontCacheFallback: true,
      commerceSource: "medusa_checkout_required",
    },
  });
}

async function queryCacheSchema(schema: "app_public" | "public", options: { handle?: string; limit?: number }) {
  const { supabaseUrl, supabaseAnonKey } = fallbackClientConfig();
  if (!supabaseUrl || !supabaseAnonKey) return { products: [] as MedusaStoreProduct[], reason: "fallback_env_missing" };

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const from = schema === "app_public" ? supabase.schema("app_public").from("storefront_product_cache") : supabase.from("storefront_product_cache");
  let query = from
    .select("id,medusa_product_id,handle,title,description,thumbnail,image_url,price_minor,currency_code,default_variant_id,supplier,supplier_product_id,supplier_sku,delivery_estimate,metadata")
    .eq("active", true)
    .limit(options.limit || 20);
  if (options.handle) query = query.eq("handle", options.handle);

  const { data, error } = await query;
  if (error) return { products: [] as MedusaStoreProduct[], reason: error.message };
  return { products: (data || []).map((row) => rowToProduct(row as StorefrontProductCacheRow)), reason: null };
}

export async function fetchSupabaseStorefrontProductCache(options: { handle?: string; limit?: number } = {}) {
  const appPublic = await queryCacheSchema("app_public", options);
  if (appPublic.products.length > 0 || appPublic.reason === null) return { ...appPublic, source: "app_public.storefront_product_cache" };
  const publicSchema = await queryCacheSchema("public", options);
  return { ...publicSchema, source: "public.storefront_product_cache" };
}
