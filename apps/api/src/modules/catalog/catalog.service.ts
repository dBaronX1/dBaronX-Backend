import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PublicCatalogProduct } from "./catalog.types";

type MedusaRecord = Record<string, unknown>;

const SECRET_FIELD_PATTERN = /(secret|token|password|api[_-]?key|publishable[_-]?key|service[_-]?role|webhook|database[_-]?url|supplier[_-]?(price|cost)|shipping[_-]?cost|cost|margin|profit|admin|private|internal)/i;
const DEFAULT_MEDUSA_BASE_URL = "https://dbaronx-medusa-xrwh.onrender.com";
const SHIRT_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown): number | null {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function cleanBaseUrl(value: string | undefined): string {
  return (value || "").trim().replace(/\/+$/, "");
}

function asRecord(value: unknown): MedusaRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as MedusaRecord) : {};
}

function stripInternalFields(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripInternalFields);
  const output: MedusaRecord = {};
  for (const [key, item] of Object.entries(value as MedusaRecord)) {
    if (SECRET_FIELD_PATTERN.test(key)) continue;
    if (["sales_channels", "variants", "options", "profile", "collection"].includes(key)) continue;
    output[key] = item && typeof item === "object" ? stripInternalFields(item) : item;
  }
  return output;
}

function medusaProductsFromPayload(payload: unknown): MedusaRecord[] {
  const root = asRecord(payload);
  const data = asRecord(root.data);
  const candidates = [root.products, data.products, root.items, data.items, root.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate.filter((item): item is MedusaRecord => Boolean(item && typeof item === "object"));
  }
  const product = asRecord(root.product).id ? asRecord(root.product) : asRecord(data.product);
  return product.id ? [product] : [];
}

function imageUrls(product: MedusaRecord): string[] {
  const images = Array.isArray(product.images) ? product.images : [];
  return images
    .map((image) => text(asRecord(image).url || image))
    .filter(Boolean);
}

function firstCategory(product: MedusaRecord): string {
  const categories = Array.isArray(product.categories) ? product.categories : [];
  const category = asRecord(categories[0]);
  return text(category.name || category.handle || asRecord(product.category).name || product.type || "");
}

function firstVariant(product: MedusaRecord): MedusaRecord {
  const variants = Array.isArray(product.variants) ? product.variants : [];
  return asRecord(variants.find((variant) => text(asRecord(variant).id)) || variants[0]);
}

function variantPriceMinor(variant: MedusaRecord): { priceMinor: number | null; currencyCode: string } {
  const calculated = asRecord(variant.calculated_price);
  const calculatedAmount = numberValue(calculated.calculated_amount ?? calculated.amount);
  if (calculatedAmount && calculatedAmount > 0) {
    return { priceMinor: calculatedAmount, currencyCode: text(calculated.currency_code || calculated.currency) || "usd" };
  }

  const prices = Array.isArray(variant.prices) ? variant.prices : [];
  const price = prices.map(asRecord).find((item) => {
    const amount = numberValue(item.amount);
    return amount !== null && amount > 0;
  });
  const amount = numberValue(price?.amount);
  return { priceMinor: amount && amount > 0 ? amount : null, currencyCode: text(price?.currency_code) || "usd" };
}

function inventory(product: MedusaRecord, variant: MedusaRecord): { inStock: boolean; inventoryStatus: string } {
  const quantity = numberValue(variant.available_quantity ?? variant.stocked_quantity ?? variant.inventory_quantity ?? product.inventory_quantity);
  if (quantity !== null) {
    return quantity > 0
      ? { inStock: true, inventoryStatus: `available:${quantity}` }
      : { inStock: false, inventoryStatus: "availability_pending" };
  }
  if (variant.manage_inventory === false) return { inStock: true, inventoryStatus: "available" };
  return { inStock: true, inventoryStatus: "availability_managed_by_medusa" };
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(private readonly config: ConfigService) {}

  async listProducts(options: { limit?: number; handle?: string } = {}) {
    const warnings: string[] = [];
    const products = await this.fetchMedusaProducts(options, warnings);
    const normalized = products.map((product) => this.normalize(product)).filter((product) => product.buyable);
    return { success: true, products: normalized, count: normalized.length, source: "medusa" as const, warnings };
  }

  async productByHandle(handle: string) {
    const normalizedHandle = text(handle);
    if (!normalizedHandle) {
      throw new HttpException({ success: false, product: null, message: "Product handle is required." }, HttpStatus.NOT_FOUND);
    }
    const result = await this.listProducts({ handle: normalizedHandle, limit: 10 });
    const product = result.products.find((item) => item.handle === normalizedHandle) || result.products[0] || null;
    if (!product) {
      throw new HttpException({ success: false, product: null, products: [], count: 0, source: "medusa", warnings: result.warnings, message: "Product not found." }, HttpStatus.NOT_FOUND);
    }
    return { success: true, product, products: [product], count: 1, source: "medusa" as const, warnings: result.warnings };
  }

  async readiness() {
    const blockers: string[] = [];
    const warnings: string[] = [];
    const publishableKeyConfigured = Boolean(this.medusaPublishableKey());
    if (!publishableKeyConfigured) blockers.push("medusa_publishable_key_missing");

    let medusaReachable = false;
    let productsVisible = false;
    let firstCjProductVisible = false;
    let productCount = 0;
    let manualCuratedBuyableCount = 0;

    try {
      const products = (await this.fetchMedusaProducts({ limit: 50 }, warnings)).map((product) => this.normalize(product));
      medusaReachable = true;
      productCount = products.length;
      productsVisible = productCount > 0;
      firstCjProductVisible = products.some((product) => product.supplier === "cj" && product.buyable);
      manualCuratedBuyableCount = products.filter((product) => product.supplier === "cj" && product.manualCurated && product.buyable).length;
    } catch (error) {
      this.logger.warn(`Catalog readiness failed: ${error instanceof Error ? error.message : String(error)}`);
      blockers.push("medusa_catalog_unreachable");
    }

    if (!productsVisible) blockers.push("medusa_products_not_visible");
    if (!firstCjProductVisible) blockers.push("cj_products_not_visible");
    if (manualCuratedBuyableCount < 1) blockers.push("manual_curated_buyable_products_missing");

    return {
      success: blockers.length === 0,
      medusaReachable,
      publishableKeyConfigured,
      productsVisible,
      productCount,
      firstCjProductVisible,
      manualCuratedBuyableCount,
      blockers,
      warnings,
      source: "medusa",
    };
  }

  private async fetchMedusaProducts(options: { limit?: number; handle?: string }, warnings: string[]): Promise<MedusaRecord[]> {
    const baseUrl = this.medusaBaseUrl();
    const url = new URL(`${baseUrl}/store/products`);
    url.searchParams.set("limit", String(options.limit || 24));
    if (options.handle) url.searchParams.set("handle", options.handle);

    const headers: Record<string, string> = { accept: "application/json" };
    const publishableKey = this.medusaPublishableKey();
    if (publishableKey) headers["x-publishable-api-key"] = publishableKey;

    const response = await fetch(url, { headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      warnings.push(`medusa_store_products_http_${response.status}`);
      throw new HttpException({ success: false, products: [], count: 0, source: "medusa", warnings, message: "Catalog is temporarily unavailable." }, HttpStatus.BAD_GATEWAY);
    }
    return medusaProductsFromPayload(payload);
  }

  private normalize(product: MedusaRecord): PublicCatalogProduct {
    const metadata = asRecord(product.metadata);
    const variant = firstVariant(product);
    const { priceMinor, currencyCode } = variantPriceMinor(variant);
    const variantId = text(variant.id || metadata.variantId || metadata.variant_id);
    const productId = text(product.id || metadata.productId || metadata.product_id);
    const images = imageUrls(product);
    const thumbnail = text(product.thumbnail) || images[0] || "";
    const supplier = (text(metadata.supplier || product.supplier) || "cj").toLowerCase();
    const publicMetadata = stripInternalFields({
      supplierProductId: metadata.supplierProductId || metadata.supplier_product_id,
      supplierSku: metadata.supplierSku || metadata.supplier_sku,
      fulfillmentProvider: metadata.fulfillmentProvider || metadata.fulfillment_provider,
      supplierVerificationStatus: metadata.supplierVerificationStatus || metadata.supplier_verification_status,
      cjProductId: metadata.cjProductId || metadata.cj_product_id,
      manualCurated: metadata.manualCurated ?? metadata.manual_curated,
      realSupplierProduct: metadata.realSupplierProduct ?? metadata.real_supplier_product,
    }) as Record<string, unknown>;
    const stock = inventory(product, variant);
    const realSupplierProduct = metadata.realSupplierProduct === true || metadata.real_supplier_product === true || supplier === "cj";
    const manualCurated = metadata.manualCurated === true || metadata.manual_curated === true || metadata.seedSource === "manual_cj_curated" || metadata.seed_source === "manual_cj_curated";

    return {
      id: productId,
      title: text(product.title) || "dBaronX product",
      handle: text(product.handle),
      description: text(product.description || product.subtitle),
      thumbnail,
      images,
      category: firstCategory(product),
      priceMinor,
      currencyCode: currencyCode.toLowerCase(),
      variantId,
      productId,
      inStock: stock.inStock,
      inventoryStatus: stock.inventoryStatus,
      supplier,
      realSupplierProduct,
      manualCurated,
      buyable: Boolean(productId && variantId && priceMinor && priceMinor > 0),
      deliveryEstimate: text(metadata.deliveryEstimate || metadata.delivery_estimate) || "Estimated delivery shown at checkout",
      sourceUrl: text(metadata.sourceUrl || metadata.source_url || metadata.cjUrl || metadata.cj_url),
      metadataPublic: publicMetadata,
    };
  }

  private medusaBaseUrl(): string {
    return cleanBaseUrl(this.config.get<string>("MEDUSA_BASE_URL") || process.env.MEDUSA_BASE_URL || DEFAULT_MEDUSA_BASE_URL);
  }

  private medusaPublishableKey(): string {
    return text(this.config.get<string>("MEDUSA_PUBLISHABLE_KEY") || process.env.MEDUSA_PUBLISHABLE_KEY);
  }
}
