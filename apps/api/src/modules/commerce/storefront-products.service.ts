import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

type StorefrontProductRow = Record<string, unknown> & {
  id?: string;
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
  currency_code?: string | null;
  inventory_quantity?: number | null;
  stock_status?: string | null;
  supplier?: string | null;
  supplier_product_id?: string | null;
  supplier_sku?: string | null;
  delivery_estimate?: string | null;
  checkout_enabled?: boolean | null;
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function images(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
}

function formatPrice(priceMinor?: number | null, currencyCode?: string | null) {
  const amount = Number(priceMinor);
  if (!Number.isFinite(amount) || amount <= 0) return "Contact support";
  return `${(amount / 100).toFixed(2)} ${text(currencyCode || "usd").toUpperCase() || "USD"}`;
}

@Injectable()
export class StorefrontProductsService {
  constructor(private readonly supabase: SupabaseService) {}

  async list(options: { limit?: number; handle?: string } = {}) {
    let query = this.supabase
      .schema("app_public")
      .from("storefront_products")
      .select("id,supplier,supplier_product_id,supplier_sku,medusa_product_id,medusa_variant_id,handle,title,description,short_description,thumbnail,image_url,images,price_minor,currency_code,inventory_quantity,stock_status,delivery_estimate,metadata,checkout_enabled")
      .eq("active", true)
      .eq("verification_status", "verified")
      .order("updated_at", { ascending: false })
      .limit(options.limit || 24);

    if (options.handle) query = query.eq("handle", options.handle).limit(options.limit || 5);

    const { data, error } = await query;
    if (error) {
      return { success: false, products: [], product: options.handle ? null : undefined, message: "Products are temporarily unavailable. Please try again shortly or contact support." };
    }
    const products = (data || []).map((row) => this.normalize(row as StorefrontProductRow));
    const product = options.handle ? products.find((item) => item.handle === options.handle) || products[0] || null : undefined;
    return {
      success: options.handle ? Boolean(product) : true,
      source: "supabase_storefront_products",
      ...(options.handle ? { product } : {}),
      products: options.handle && product ? [product] : products,
    };
  }

  private normalize(row: StorefrontProductRow) {
    const productImages = images(row.images);
    const image = text(row.thumbnail) || text(row.image_url) || productImages[0] || "";
    const variantId = text(row.medusa_variant_id);
    const checkoutEnabled = row.checkout_enabled === true && Boolean(variantId);
    const priceMinor = typeof row.price_minor === "number" ? row.price_minor : undefined;
    const currencyCode = text(row.currency_code || "usd") || "usd";
    const title = text(row.title) || "dBaronX product";
    return {
      id: text(row.medusa_product_id) || text(row.id),
      title,
      name: title,
      handle: text(row.handle),
      description: text(row.description) || text(row.short_description),
      thumbnail: image,
      image,
      image_url: image,
      images: productImages.map((url) => ({ url })),
      price: priceMinor ? priceMinor / 100 : undefined,
      priceMinor,
      priceFormatted: formatPrice(priceMinor, currencyCode),
      currencyCode: currencyCode.toUpperCase(),
      defaultVariantId: checkoutEnabled ? variantId : "",
      variants: checkoutEnabled ? [{ id: variantId, prices: priceMinor ? [{ amount: priceMinor, currency_code: currencyCode }] : [] }] : [],
      checkoutEnabled,
      stockStatus: text(row.stock_status) || "unknown",
      inventoryQuantity: typeof row.inventory_quantity === "number" ? row.inventory_quantity : undefined,
      supplier: text(row.supplier),
      supplierProductId: text(row.supplier_product_id),
      supplierSku: text(row.supplier_sku),
      deliveryEstimate: text(row.delivery_estimate),
      productUrl: text(row.handle) ? `/products/${text(row.handle)}` : "/products",
    };
  }
}
