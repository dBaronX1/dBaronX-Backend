import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { MedusaHttpService } from "../../shared/services/medusa-http.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { MedusaStoreProduct, MedusaStoreVariant, PublicCatalogProduct } from "./catalog.types";

const SECRET_FIELD_PATTERN = /(secret|token|password|api[_-]?key|publishable[_-]?key|service[_-]?role|database[_-]?url|cost|supplier[_-]?price|supplier[_-]?cost|shipping[_-]?cost|internal|admin|webhook)/i;
const SHIRT_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";
const SAFE_CATALOG_MESSAGE = "Products are temporarily unavailable. Please try again.";
const STORE_PRODUCT_FIELDS = "*variants,*variants.prices,*variants.calculated_price,*images,*categories,*collection,*type";

type MedusaProductsPayload = { products?: MedusaStoreProduct[]; count?: number; limit?: number; offset?: number };

type CatalogBridgeDiagnostics = {
  medusaStatus: "not_checked" | "reachable" | "unreachable";
  medusaProductsFetched: number;
  normalizedProductCount: number;
  skippedProductCount: number;
  missingVariantCount: number;
  missingPriceCount: number;
  missingImageCount: number;
  publishableKeyConfigured: boolean;
  medusaBaseUrlConfigured: boolean;
};

type NormalizedCatalog = {
  products: PublicCatalogProduct[];
  diagnostics: CatalogBridgeDiagnostics;
};

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

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function metadataOf(product: MedusaStoreProduct) {
  return objectValue(product.metadata);
}

function publicMetadata(metadata: Record<string, unknown>) {
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (SECRET_FIELD_PATTERN.test(key)) continue;
    if (["raw", "payload", "admin_payload", "cj_raw", "medusa_raw", "supplier", "source", "sourceUrl", "source_url"].includes(key)) continue;
    if (value && typeof value === "object") continue;
    const publicValue = typeof value === "string" ? safePublicText(value) : value;
    if (typeof publicValue === "string" && !publicValue) continue;
    output[key] = publicValue;
  }
  return Object.fromEntries(Object.entries(output).filter(([, value]) => value !== undefined));
}

function safePublicText(value: string) {
  return value
    .replace(/CJ Dropshipping|CJ|Medusa|Supabase|FastAPI|NestJS|Rocket|Render|GitHub|Kickstarter|supplier=cj|source=rocket_web/gi, "Verified Supplier")
    .trim();
}

function imageUrls(product: MedusaStoreProduct, metadata: Record<string, unknown>) {
  const urls = new Set<string>();
  const add = (value: unknown) => {
    const url = text(value);
    if (url) urls.add(url);
  };
  add(product.image_url);
  add(product.image);
  add(metadata.imageUrl);
  add(metadata.image_url);
  if (Array.isArray(product.images)) {
    for (const image of product.images) add(typeof image === "string" ? image : image?.url);
  }
  add(product.thumbnail);
  return [...urls];
}

function firstVariant(product: MedusaStoreProduct) {
  return Array.isArray(product.variants) ? product.variants.find((variant) => text(variant?.id)) || product.variants[0] || null : null;
}

function priceFromVariant(variant: MedusaStoreVariant | null, product: MedusaStoreProduct) {
  const calculated = objectValue(variant?.calculated_price);
  const nestedCalculated = objectValue(calculated.calculated_price);
  const nestedPrice = objectValue(calculated.price);
  const priceList = Array.isArray(variant?.prices) ? variant.prices : [];
  const firstPositivePrice = priceList.find((price) => Number(price?.amount) > 0);
  const amount =
    num(calculated.calculated_amount) ??
    num(calculated.amount) ??
    num(calculated.original_amount) ??
    num(nestedCalculated.calculated_amount) ??
    num(nestedCalculated.amount) ??
    num(nestedPrice.amount) ??
    num(firstPositivePrice?.amount) ??
    num(product.priceMinor) ??
    num(product.price_minor) ??
    null;
  const currency =
    text(calculated.currency_code) ||
    text(calculated.currency) ||
    text(nestedCalculated.currency_code) ||
    text(nestedPrice.currency_code) ||
    text(firstPositivePrice?.currency_code) ||
    text(product.currencyCode) ||
    text(product.currency_code) ||
    "usd";
  return { amount: amount && amount > 0 ? Math.round(amount) : null, currencyCode: currency.toLowerCase() };
}

function uniquePaths(paths: string[]) {
  return [...new Set(paths)];
}

@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly medusaHttp: MedusaHttpService,
    private readonly supabase: SupabaseService,
  ) {}

  async listProducts(options: { limit?: number } = {}) {
    const limit = Math.min(Math.max(Number(options.limit || 50) || 50, 1), 100);
    const { products, source, warnings } = await this.fetchCatalogProductsWithFallback(this.listPaths(limit), { limit });
    const normalized = this.normalizeProducts(products);
    return {
      success: true,
      products: normalized.products,
      count: normalized.products.length,
      catalogSource: "verified_catalog",
      warnings: [...warnings, ...(normalized.products.length === 0 && products.length > 0 ? ["catalog_products_skipped_until_buyable"] : [])],
      diagnostics: normalized.diagnostics,
    };
  }

  async productByHandle(handle: string) {
    const cleanHandle = text(decodeURIComponent(handle || ""));
    if (!cleanHandle) {
      throw new HttpException(
        { success: false, product: null, products: [], code: "PRODUCT_NOT_FOUND", message: "Product was not found." },
        HttpStatus.NOT_FOUND,
      );
    }
    const { products, source, warnings } = await this.fetchCatalogProductsWithFallback(this.detailPaths(cleanHandle), { limit: 5, handle: cleanHandle });
    const normalized = this.normalizeProducts(products);
    const product = normalized.products.find((item) => item.handle === cleanHandle) || null;
    if (!product) {
      throw new HttpException(
        { success: false, product: null, products: [], code: "PRODUCT_NOT_FOUND", message: "Product was not found." },
        HttpStatus.NOT_FOUND,
      );
    }
    return { success: true, product, products: [product], count: 1, catalogSource: "verified_catalog", warnings, diagnostics: normalized.diagnostics };
  }

  async readiness() {
    const blockers: string[] = [];
    let medusaReachable = false;
    let medusaStoreProductsWithPublishableKey = false;
    let productCount = 0;
    let medusaProductsFetched = 0;
    let firstCjProductVisible = false;
    let manualCuratedBuyableCount = 0;
    let source = "medusa";
    const warnings: string[] = [];
    let diagnostics = this.emptyDiagnostics("not_checked");

    const publishableKeyConfigured = this.medusaHttp.getPublishableKeyConfigured();
    const medusaBaseUrlConfigured = this.medusaHttp.getBaseUrlConfigured();

    if (!medusaBaseUrlConfigured) blockers.push("medusa_base_url_missing");
    if (!publishableKeyConfigured) blockers.push("medusa_publishable_key_missing");

    try {
      const products = await this.fetchMedusaProducts(this.listPaths(50), "catalog-readiness");
      medusaReachable = true;
      medusaStoreProductsWithPublishableKey = publishableKeyConfigured;
      medusaProductsFetched = products.length;
      const normalized = this.normalizeProducts(products);
      diagnostics = normalized.diagnostics;
      productCount = normalized.products.length;
      firstCjProductVisible = normalized.products.some((product) => product.handle === SHIRT_HANDLE && product.buyable);
      manualCuratedBuyableCount = normalized.products.filter((product) => product.manualCurated && product.buyable).length;
    } catch (error) {
      diagnostics = this.emptyDiagnostics("unreachable");
      this.logger.warn(JSON.stringify({ event: "catalog_readiness_medusa_unreachable", error: this.safeErrorName(error) }));
      blockers.push("medusa_unreachable");

      const fallbackProducts = await this.fetchStorefrontProducts({ limit: 50 });
      if (fallbackProducts.length > 0) {
        const normalized = this.normalizeProducts(fallbackProducts);
        diagnostics = {
          ...normalized.diagnostics,
          medusaStatus: "unreachable",
        };
        productCount = normalized.products.length;
        medusaProductsFetched = fallbackProducts.length;
        firstCjProductVisible = normalized.products.some((product) => product.handle === SHIRT_HANDLE && product.buyable);
        manualCuratedBuyableCount = normalized.products.filter((product) => product.manualCurated && product.buyable).length;
        source = "supabase_storefront_products";
        warnings.push("medusa_store_api_unavailable_using_verified_storefront_snapshot");
      }
    }

    if (!productCount) blockers.push("medusa_products_not_visible");
    if (medusaProductsFetched > 0 && !productCount) blockers.push("medusa_products_not_normalizable");
    if (medusaProductsFetched > 0 && !firstCjProductVisible) blockers.push("first_cj_product_not_visible");
    if (medusaProductsFetched > 0 && !manualCuratedBuyableCount) blockers.push("manual_curated_buyable_products_missing");

    return {
      success: blockers.length === 0,
      medusaReachable,
      medusaBaseUrlConfigured,
      publishableKeyConfigured,
      medusaStoreProductsWithPublishableKey,
      productsVisible: productCount > 0,
      productCount,
      firstCjProductVisible,
      manualCuratedBuyableCount,
      blockers: [...new Set(blockers)],
      source,
      warnings,
      diagnostics,
    };
  }

  private listPaths(limit: number) {
    return uniquePaths([
      `/store/products?limit=${limit}&fields=${encodeURIComponent(STORE_PRODUCT_FIELDS)}`,
      `/store/products?limit=${limit}`,
    ]);
  }

  private detailPaths(handle: string) {
    const encoded = encodeURIComponent(handle);
    return uniquePaths([
      `/store/products?handle=${encoded}&limit=5&fields=${encodeURIComponent(STORE_PRODUCT_FIELDS)}`,
      `/store/products?handle=${encoded}&limit=5`,
    ]);
  }

  private async fetchCatalogProductsWithFallback(paths: string[], options: { limit: number; handle?: string }) {
    try {
      return {
        products: await this.fetchMedusaProducts(paths, "public-catalog"),
        source: "medusa",
        warnings: [] as string[],
      };
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: "catalog_medusa_bridge_failed_trying_storefront_snapshot", error: this.safeErrorName(error) }));
      const fallbackProducts = await this.fetchStorefrontProducts(options);
      if (fallbackProducts.length > 0) {
        return {
          products: fallbackProducts,
          source: "supabase_storefront_products",
          warnings: ["medusa_store_api_unavailable_using_verified_storefront_snapshot"],
        };
      }
      return { products: await this.fetchMedusaProductsWithSafeError(paths), source: "medusa", warnings: [] as string[] };
    }
  }

  private async fetchStorefrontProducts(options: { limit: number; handle?: string }): Promise<MedusaStoreProduct[]> {
    try {
      let query = this.supabase
        .schema("app_public")
        .from("storefront_products")
        .select("id,supplier,supplier_product_id,supplier_sku,medusa_product_id,medusa_variant_id,handle,title,description,short_description,thumbnail,image_url,images,price_minor,currency_code,inventory_quantity,stock_status,delivery_estimate,metadata,checkout_enabled")
        .eq("active", true)
        .eq("verification_status", "verified")
        .order("updated_at", { ascending: false })
        .limit(options.limit);

      if (options.handle) query = query.eq("handle", options.handle).limit(options.limit);

      const { data, error } = await query;
      if (error || !Array.isArray(data)) return [];
      return data.map((row) => this.storefrontRowToMedusaProduct(row as Record<string, unknown>));
    } catch (error) {
      this.logger.warn(JSON.stringify({ event: "catalog_storefront_snapshot_failed", error: this.safeErrorName(error) }));
      return [];
    }
  }

  private storefrontRowToMedusaProduct(row: Record<string, unknown>): MedusaStoreProduct {
    const metadata = objectValue(row.metadata);
    const imageList = Array.isArray(row.images) ? row.images.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
    const variantId = text(row.medusa_variant_id);
    const priceMinor = num(row.price_minor);
    const currencyCode = text(row.currency_code) || "usd";
    return {
      id: text(row.medusa_product_id) || text(row.id),
      title: text(row.title),
      handle: text(row.handle),
      description: text(row.description) || text(row.short_description),
      thumbnail: text(row.thumbnail) || text(row.image_url) || imageList[0] || "",
      images: imageList.map((url) => ({ url })),
      variants: variantId
        ? [
            {
              id: variantId,
              manage_inventory: false,
              prices: priceMinor ? [{ amount: priceMinor, currency_code: currencyCode }] : [],
            },
          ]
        : [],
      metadata: {
        ...metadata,
        supplier: text(row.supplier) || text(metadata.supplier),
        supplierProductId: text(row.supplier_product_id) || text(metadata.supplierProductId),
        supplierSku: text(row.supplier_sku) || text(metadata.supplierSku),
        deliveryEstimate: text(row.delivery_estimate) || text(metadata.deliveryEstimate),
        imageUrl: text(row.image_url) || text(metadata.imageUrl),
        manualCurated: true,
        realSupplierProduct: true,
      },
      inventory_quantity: num(row.inventory_quantity) ?? undefined,
    };
  }

  private async fetchMedusaProductsWithSafeError(paths: string[]) {
    try {
      return await this.fetchMedusaProducts(paths, "public-catalog");
    } catch (error) {
      this.logger.error(JSON.stringify({ event: "catalog_medusa_bridge_failed", error: this.safeErrorName(error) }));
      throw new HttpException(
        {
          success: false,
          products: [],
          product: null,
          code: "CATALOG_TEMPORARILY_UNAVAILABLE",
          message: SAFE_CATALOG_MESSAGE,
          diagnostics: this.emptyDiagnostics("unreachable"),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async fetchMedusaProducts(paths: string[], callerSurface: string) {
    let lastError: unknown;
    for (const path of paths) {
      try {
        const payload = await this.medusaHttp.get<MedusaProductsPayload>(path, { "x-caller-surface": callerSurface }, "store");
        if (Array.isArray(payload.products)) return payload.products;
        this.logger.warn(JSON.stringify({ event: "catalog_medusa_shape_mismatch", callerSurface }));
        return [];
      } catch (error) {
        lastError = error;
        this.logger.warn(JSON.stringify({ event: "catalog_medusa_path_failed", callerSurface, path: this.redactPath(path), error: this.safeErrorName(error) }));
      }
    }
    throw lastError instanceof Error ? lastError : new Error("catalog_medusa_unavailable");
  }

  private normalizeProducts(products: MedusaStoreProduct[]): NormalizedCatalog {
    const diagnostics = this.emptyDiagnostics("reachable");
    diagnostics.medusaProductsFetched = products.length;
    const normalized: PublicCatalogProduct[] = [];

    for (const product of products) {
      const publicProduct = this.normalizeProduct(product);
      if (!publicProduct.variantId) diagnostics.missingVariantCount += 1;
      if (!publicProduct.priceMinor || publicProduct.priceMinor <= 0) diagnostics.missingPriceCount += 1;
      if (publicProduct.images.length === 0) diagnostics.missingImageCount += 1;
      if (!publicProduct.buyable) {
        diagnostics.skippedProductCount += 1;
        continue;
      }
      normalized.push(publicProduct);
    }

    diagnostics.normalizedProductCount = normalized.length;
    return { products: normalized, diagnostics };
  }

  private emptyDiagnostics(medusaStatus: CatalogBridgeDiagnostics["medusaStatus"]): CatalogBridgeDiagnostics {
    return {
      medusaStatus,
      medusaProductsFetched: 0,
      normalizedProductCount: 0,
      skippedProductCount: 0,
      missingVariantCount: 0,
      missingPriceCount: 0,
      missingImageCount: 0,
      publishableKeyConfigured: this.medusaHttp.getPublishableKeyConfigured(),
      medusaBaseUrlConfigured: this.medusaHttp.getBaseUrlConfigured(),
    };
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
      imageUrl: images[0] || text(product.thumbnail) || "",
      thumbnail: text(product.thumbnail) || images[0] || "",
      images,
      category,
      priceMinor: amount,
      currencyCode: currencyCode.toUpperCase(),
      variantId,
      productId,
      inStock,
      inventoryStatus: inStock ? "in_stock" : "out_of_stock",
      supplier: "Verified Supplier",
      realSupplierProduct,
      manualCurated,
      buyable,
      deliveryEstimate: text(metadata.deliveryEstimate) || text(metadata.delivery_estimate) || "Ships after checkout confirmation",
      publicLabels: ["Verified Supplier", "Direct Shipping", "Global Supplier"],
      sourceUrl: "",
      metadataPublic: publicMetadata(metadata),
    };
  }

  private redactPath(path: string) {
    return path.replace(/(x-publishable-api-key|api_key|token|secret)=[^&]+/gi, "$1=redacted");
  }

  private safeErrorName(error: unknown) {
    return error instanceof Error ? error.name : typeof error;
  }
}
