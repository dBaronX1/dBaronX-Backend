import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { MedusaHttpService } from "../../shared/services/medusa-http.service";
import { MedusaStoreProduct, MedusaStoreVariant, PublicCatalogProduct } from "./catalog.types";

const SECRET_FIELD_PATTERN = /(secret|token|password|api[_-]?key|publishable[_-]?key|service[_-]?role|database[_-]?url|cost|supplier[_-]?price|supplier[_-]?cost|shipping[_-]?cost|internal|admin|webhook)/i;
const SHIRT_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";

type MedusaProductsPayload = { products?: MedusaStoreProduct[]; count?: number; limit?: number; offset?: number };

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function bool(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "1"].includes(value.toLowerCase());
  return fallback;
}

function num(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function metadataOf(product: MedusaStoreProduct) {
  return product.metadata && typeof product.metadata === "object" && !Array.isArray(product.metadata) ? product.metadata : {};
}

function publicMetadata(metadata: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_FIELD_PATTERN.test(key)) continue;
    if (["raw", "payload", "admin_payload", "cj_raw", "medusa_raw"].includes(key)) continue;
    output[key] = value && typeof value === "object" ? undefined : value;
  }
  return Object.fromEntries(Object.entries(output).filter(([, value]) => value !== undefined));
}

function imageUrls(product: MedusaStoreProduct, metadata: Record<string, unknown>) {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    const url = text(value);
    if (url) urls.add(url);
  };
  add(product.thumbnail);
  add(product.image);
  add(product.image_url);
  add(metadata.imageUrl);
  add(metadata.image_url);
  if (Array.isArray(product.images)) {
    for (const image of product.images) add(typeof image === "string" ? image : image?.url);
  }
  return [...urls];
}

function firstVariant(product: MedusaStoreProduct) {
  return Array.isArray(product.variants) ? product.variants.find((variant) => text(variant?.id)) || product.variants[0] || null : null;
}

function priceFromVariant(variant: MedusaStoreVariant | null, product: MedusaStoreProduct) {
  const calculated = variant?.calculated_price && typeof variant.calculated_price === "object" ? variant.calculated_price : {};
  const nestedCalculated = calculated.calculated_price && typeof calculated.calculated_price === "object" ? calculated.calculated_price as Record<string, unknown> : {};
  const nestedPrice = calculated.price && typeof calculated.price === "object" ? calculated.price as Record<string, unknown> : {};
  const amount =
    num(calculated.calculated_amount) ??
    num(calculated.amount) ??
    num(calculated.original_amount) ??
    num(nestedCalculated.amount) ??
    num(nestedPrice.amount) ??
    (Array.isArray(variant?.prices) ? num(variant.prices.find((price) => Number(price?.amount) > 0)?.amount) : null) ??
    num(product.priceMinor) ??
    num(product.price_minor) ??
    null;
  const currency =
    text(calculated.currency_code) ||
    text(calculated.currency) ||
    text(nestedCalculated.currency_code) ||
    text(nestedPrice.currency_code) ||
    (Array.isArray(variant?.prices) ? text(variant.prices.find((price) => price?.currency_code)?.currency_code) : "") ||
    text(product.currencyCode) ||
    text(product.currency_code) ||
    "usd";
  return { amount: amount && amount > 0 ? Math.round(amount) : null, currencyCode: currency.toLowerCase() };
}

@Injectable()
export class CatalogService {
  constructor(private readonly medusaHttp: MedusaHttpService) {}

  async listProducts(options: { limit?: number } = {}) {
    const limit = Math.min(Math.max(Number(options.limit || 50) || 50, 1), 100);
    const warnings: string[] = [];
    const products = await this.fetchMedusaProducts(`/store/products?limit=${limit}&fields=*variants,*variants.prices,*variants.calculated_price,*images,*categories,*collection,*type`);
    const normalized = products.map((product) => this.normalizeProduct(product)).filter((product) => product.buyable);
    return { success: true, products: normalized, count: normalized.length, source: "medusa", warnings };
  }

  async productByHandle(handle: string) {
    const cleanHandle = text(decodeURIComponent(handle || ""));
    if (!cleanHandle) throw new HttpException({ success: false, product: null, products: [], code: "catalog_handle_required" }, HttpStatus.NOT_FOUND);
    const products = await this.fetchMedusaProducts(`/store/products?handle=${encodeURIComponent(cleanHandle)}&limit=5&fields=*variants,*variants.prices,*variants.calculated_price,*images,*categories,*collection,*type`);
    const product = products.map((item) => this.normalizeProduct(item)).find((item) => item.handle === cleanHandle) || null;
    if (!product) throw new HttpException({ success: false, product: null, products: [], code: "catalog_product_not_found", source: "medusa" }, HttpStatus.NOT_FOUND);
    return { success: true, product, products: [product], count: 1, source: "medusa", warnings: [] };
  }

  async readiness() {
    const blockers: string[] = [];
    let medusaReachable = false;
    let productCount = 0;
    let firstCjProductVisible = false;
    let manualCuratedBuyableCount = 0;
    let products: PublicCatalogProduct[] = [];

    try {
      const payload = await this.medusaHttp.get<MedusaProductsPayload>("/store/products?limit=50&fields=*variants,*variants.prices,*variants.calculated_price,*images", { "x-caller-surface": "catalog-readiness" }, "store");
      medusaReachable = true;
      products = (payload.products || []).map((product) => this.normalizeProduct(product));
      productCount = products.length;
      firstCjProductVisible = products.some((product) => product.supplier === "cj" && product.buyable) || products.some((product) => product.handle === SHIRT_HANDLE && product.buyable);
      manualCuratedBuyableCount = products.filter((product) => product.manualCurated && product.buyable).length;
    } catch {
      blockers.push("medusa_unreachable");
    }

    const publishableKeyConfigured = this.medusaHttp.getPublishableKeyConfigured();
    if (!publishableKeyConfigured) blockers.push("medusa_publishable_key_missing");
    if (!productCount) blockers.push("medusa_products_not_visible");
    if (!firstCjProductVisible) blockers.push("first_cj_product_not_visible");
    if (!manualCuratedBuyableCount) blockers.push("manual_curated_buyable_products_missing");

    return {
      success: blockers.length === 0,
      medusaReachable,
      publishableKeyConfigured,
      productsVisible: productCount > 0,
      productCount,
      firstCjProductVisible,
      manualCuratedBuyableCount,
      blockers: [...new Set(blockers)],
      source: "medusa",
    };
  }

  private async fetchMedusaProducts(path: string) {
    const payload = await this.medusaHttp.get<MedusaProductsPayload>(path, { "x-caller-surface": "public-catalog" }, "store");
    return Array.isArray(payload.products) ? payload.products : [];
  }

  private normalizeProduct(product: MedusaStoreProduct): PublicCatalogProduct {
    const metadata = metadataOf(product);
    const variant = firstVariant(product);
    const { amount, currencyCode } = priceFromVariant(variant, product);
    const variantId = text(variant?.id) || text(product.variantId) || text(product.variant_id);
    const productId = text(product.id) || text(product.productId) || text(product.product_id);
    const images = imageUrls(product, metadata);
    const supplier = (text(metadata.supplier) || text(product.supplier) || "cj").toLowerCase();
    const inventoryQuantity =
      num(product.inventoryQuantity) ??
      num(product.inventory_quantity) ??
      num(metadata.stockQty) ??
      num(metadata.inventory) ??
      num(variant?.available_quantity) ??
      num(variant?.stocked_quantity) ??
      num(variant?.inventory_quantity);
    const inStock = variant?.manage_inventory === false || inventoryQuantity === null || inventoryQuantity > 0;
    const buyable = Boolean(productId && variantId && amount && amount > 0 && inStock);
    const manualCurated = bool(metadata.manualCurated) || bool(metadata.manual_curated) || text(metadata.curatedBy).toLowerCase().includes("manual") || text(metadata.source).toLowerCase().includes("manual");
    const realSupplierProduct = bool(metadata.realSupplierProduct, supplier === "cj") || bool(metadata.real_supplier_product, supplier === "cj") || supplier === "cj";
    const category =
      text(product.categories?.[0]?.name) ||
      text(product.categories?.[0]?.handle) ||
      text(product.collection?.title) ||
      text(product.type?.value) ||
      text(metadata.category) ||
      "dBaronX catalog";

    return {
      id: productId,
      title: text(product.title) || "dBaronX product",
      handle: text(product.handle),
      description: text(product.description),
      thumbnail: text(product.thumbnail) || images[0] || "",
      images,
      category,
      priceMinor: amount,
      currencyCode: currencyCode.toUpperCase(),
      variantId,
      productId,
      inStock,
      inventoryStatus: inStock ? "in_stock" : "out_of_stock",
      supplier,
      realSupplierProduct,
      manualCurated,
      buyable,
      deliveryEstimate: text(metadata.deliveryEstimate) || text(metadata.delivery_estimate) || "Ships after checkout confirmation",
      sourceUrl: text(metadata.sourceUrl) || text(metadata.source_url) || "",
      metadataPublic: publicMetadata(metadata),
    };
  }
}
