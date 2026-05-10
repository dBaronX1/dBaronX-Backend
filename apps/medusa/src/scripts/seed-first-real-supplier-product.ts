import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows";

type QueryGraphResult = Record<string, unknown> | unknown[] | null | undefined;
type QueryGraphFn = (input: {
  entity: string;
  fields: string[];
  filters?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
}) => Promise<QueryGraphResult>;

type FirstProductMode = "draft" | "publish";

type FirstProductInput = {
  mode: FirstProductMode;
  title: string;
  handle: string;
  description: string;
  priceAmount: number;
  supplierCostAmount: number;
  supplier: string;
  supplierProductId: string;
  supplierSku: string;
  sourceUrl: string;
  imageUrl: string;
  stockQty: number;
  shippingCountries: string[];
  deliveryEstimate: string;
  verificationBlockers: string[];
};

const BASE_REQUIRED_ENV = [
  "DBX_FIRST_PRODUCT_TITLE",
  "DBX_FIRST_PRODUCT_HANDLE",
  "DBX_FIRST_PRODUCT_DESCRIPTION",
  "DBX_FIRST_PRODUCT_PRICE_USD_MINOR",
  "DBX_FIRST_PRODUCT_COST_USD_MINOR",
  "DBX_FIRST_PRODUCT_SUPPLIER",
  "DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID",
  "DBX_FIRST_PRODUCT_SUPPLIER_SKU",
  "DBX_FIRST_PRODUCT_SOURCE_URL",
] as const;

const OPTIONAL_VERIFICATION_ENV = [
  "DBX_FIRST_PRODUCT_IMAGE_URL",
  "DBX_FIRST_PRODUCT_STOCK_QTY",
  "DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES",
  "DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE",
] as const;

type FirstProductEnv = (typeof BASE_REQUIRED_ENV)[number] | (typeof OPTIONAL_VERIFICATION_ENV)[number] | "DBX_FIRST_PRODUCT_MODE";

function asArray<T = any>(value: unknown, fallbackKeys: string[] = []): T[] {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  for (const key of ["data", ...fallbackKeys]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested as T[];
  }

  return [];
}

function env(name: FirstProductEnv): string {
  return String(process.env[name] || "").trim();
}

function fail(error: string, details: Record<string, unknown> = {}): never {
  console.error(JSON.stringify({ success: false, error, ...details }, null, 2));
  process.exit(1);
}

function parseMode(): FirstProductMode {
  const value = env("DBX_FIRST_PRODUCT_MODE") || "publish";
  if (value !== "draft" && value !== "publish") {
    fail("DBX_FIRST_PRODUCT_MODE_must_be_draft_or_publish", { value });
  }
  return value;
}

function parsePositiveInteger(raw: string, name: string): number {
  if (!/^\d+$/.test(raw)) fail(`${name}_must_be_integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${name}_must_be_positive`);
  return value;
}

function parseOptionalNonNegativeInteger(raw: string, name: string): number {
  if (!raw) return 0;
  if (!/^\d+$/.test(raw)) fail(`${name}_must_be_integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) fail(`${name}_must_be_non_negative`);
  return value;
}

function assertUrl(value: string, name: string): void {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) fail(`${name}_must_be_http_url`);
  } catch {
    fail(`${name}_must_be_valid_url`);
  }
}

function parseShippingCountries(raw: string): string[] {
  return raw
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .filter(Boolean);
}

function containsDemoMarker(value: string): boolean {
  return /\b(demo|sample|mock|test product)\b/i.test(value);
}

function verificationBlockersFor(input: Omit<FirstProductInput, "verificationBlockers">): string[] {
  const blockers: string[] = [];
  if (!input.imageUrl) blockers.push("product_image_missing");
  if (input.stockQty <= 0) blockers.push("stock_unverified");
  if (input.shippingCountries.length === 0) blockers.push("shipping_country_unverified");
  if (!input.deliveryEstimate) blockers.push("delivery_estimate_unverified");
  return blockers;
}

function readInput(): FirstProductInput {
  const mode = parseMode();
  const missing = BASE_REQUIRED_ENV.filter((name) => !env(name));
  if (missing.length) fail("first_product_required_env_missing", { missing, mode });

  const inputWithoutBlockers = {
    mode,
    title: env("DBX_FIRST_PRODUCT_TITLE"),
    handle: env("DBX_FIRST_PRODUCT_HANDLE"),
    description: env("DBX_FIRST_PRODUCT_DESCRIPTION"),
    priceAmount: parsePositiveInteger(env("DBX_FIRST_PRODUCT_PRICE_USD_MINOR"), "DBX_FIRST_PRODUCT_PRICE_USD_MINOR"),
    supplierCostAmount: parsePositiveInteger(env("DBX_FIRST_PRODUCT_COST_USD_MINOR"), "DBX_FIRST_PRODUCT_COST_USD_MINOR"),
    supplier: env("DBX_FIRST_PRODUCT_SUPPLIER"),
    supplierProductId: env("DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID"),
    supplierSku: env("DBX_FIRST_PRODUCT_SUPPLIER_SKU"),
    sourceUrl: env("DBX_FIRST_PRODUCT_SOURCE_URL"),
    imageUrl: env("DBX_FIRST_PRODUCT_IMAGE_URL"),
    stockQty: parseOptionalNonNegativeInteger(env("DBX_FIRST_PRODUCT_STOCK_QTY"), "DBX_FIRST_PRODUCT_STOCK_QTY"),
    shippingCountries: parseShippingCountries(env("DBX_FIRST_PRODUCT_SHIPPING_COUNTRIES")),
    deliveryEstimate: env("DBX_FIRST_PRODUCT_DELIVERY_ESTIMATE"),
  };
  const input: FirstProductInput = { ...inputWithoutBlockers, verificationBlockers: verificationBlockersFor(inputWithoutBlockers) };

  assertUrl(input.sourceUrl, "DBX_FIRST_PRODUCT_SOURCE_URL");
  if (input.imageUrl) assertUrl(input.imageUrl, "DBX_FIRST_PRODUCT_IMAGE_URL");

  if (containsDemoMarker(`${input.title} ${input.handle} ${input.supplier} ${input.supplierProductId} ${input.supplierSku}`)) {
    fail("first_product_must_not_use_demo_sample_mock_or_test_markers");
  }

  if (input.mode === "publish" && input.verificationBlockers.length > 0) {
    fail("first_product_publish_requires_verified_image_stock_shipping_and_delivery", {
      missingOrUnverified: input.verificationBlockers,
      requiredEnv: OPTIONAL_VERIFICATION_ENV,
    });
  }

  return input;
}

function metadataFor(input: FirstProductInput) {
  const verified = input.mode === "publish";
  return {
    supplier: input.supplier,
    supplierProductId: input.supplierProductId,
    supplierSku: input.supplierSku,
    sourceUrl: input.sourceUrl,
    supplierCostUsdMinor: input.supplierCostAmount,
    shippingCountries: input.shippingCountries,
    deliveryEstimate: input.deliveryEstimate || null,
    realSupplierProduct: verified,
    demo: false,
    supplierVerificationStatus: verified ? "verified_for_checkout" : "draft_pending_verification",
    supplierVerificationBlockers: verified ? [] : input.verificationBlockers,
    blockers: verified ? [] : input.verificationBlockers,
  };
}

function productInputFor(input: FirstProductInput, defaultSalesChannelId: string, shippingProfileId: string) {
  const metadata = metadataFor(input);
  return {
    title: input.title,
    description: input.description,
    handle: input.handle,
    ...(input.imageUrl ? { thumbnail: input.imageUrl, images: [{ url: input.imageUrl }] } : { images: [] }),
    status: "published" as const,
    sales_channels: [{ id: defaultSalesChannelId }],
    shipping_profile_id: shippingProfileId,
    options: [{ title: "Variant", values: ["Default"] }],
    metadata,
    variants: [
      {
        title: "Default",
        sku: input.supplierSku,
        manage_inventory: true,
        prices: [{ amount: input.priceAmount, currency_code: "usd" }],
        options: { Variant: "Default" },
        metadata,
      },
    ],
  };
}

async function updateExistingProduct(container: ExecArgs["container"], existingProduct: any, input: FirstProductInput): Promise<void> {
  const productModuleService = container.resolve<any>("product");
  const metadata = metadataFor(input);
  await productModuleService.updateProducts([
    {
      id: existingProduct.id,
      title: input.title,
      description: input.description,
      handle: input.handle,
      ...(input.imageUrl ? { thumbnail: input.imageUrl, images: [{ url: input.imageUrl }] } : {}),
      metadata,
    },
  ]);

  const variant = asArray<any>(existingProduct.variants)[0] || null;
  if (variant?.id) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            id: variant.id,
            title: "Default",
            sku: input.supplierSku,
            manage_inventory: true,
            prices: [{ amount: input.priceAmount, currency_code: "usd" }],
            metadata,
          },
        ],
      },
    });
  }
}

async function syncInventoryLevel(container: ExecArgs["container"], query: QueryGraphFn, inventoryItemId: string | null | undefined, stockLocationId: string, stockQty: number): Promise<boolean> {
  if (!inventoryItemId || stockQty <= 0) return false;

  const existingLevelsResult = await query({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id"],
    filters: { inventory_item_id: inventoryItemId, location_id: stockLocationId },
    pagination: { take: 1 },
  });
  const existingLevel = asArray<any>(existingLevelsResult, ["inventory_levels"])[0] || null;
  if (existingLevel?.id) {
    await updateInventoryLevelsWorkflow(container).run({
      input: { updates: [{ id: existingLevel.id, inventory_item_id: inventoryItemId, location_id: stockLocationId, stocked_quantity: stockQty }] },
    });
    return true;
  }

  await createInventoryLevelsWorkflow(container).run({
    input: { inventory_levels: [{ inventory_item_id: inventoryItemId, location_id: stockLocationId, stocked_quantity: stockQty }] },
  });
  return true;
}

function firstInventoryItemId(variant: any): string | null {
  const inventoryItem = asArray<any>(variant?.inventory_items)[0] || null;
  return inventoryItem?.inventory_item_id || inventoryItem?.id || inventoryItem?.inventory?.id || null;
}

export default async function seedFirstSupplierProduct({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve<QueryGraphFn>(ContainerRegistrationKeys.QUERY);
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun") || process.env.DRY_RUN === "true";
  const input = readInput();
  const metadata = metadataFor(input);

  const existingProductsResult = await query({
    entity: "product",
    fields: ["id", "handle", "metadata", "variants.id", "variants.inventory_items.id", "variants.inventory_items.inventory_item_id", "variants.inventory_items.inventory.id"],
    filters: { handle: input.handle },
    pagination: { take: 1 },
  });
  const existingProduct = asArray<any>(existingProductsResult, ["products"])[0] || null;
  if (existingProduct) {
    const existingMetadata = existingProduct.metadata && typeof existingProduct.metadata === "object" ? existingProduct.metadata : {};
    const sameSupplierProduct =
      existingMetadata.supplierProductId === input.supplierProductId ||
      existingMetadata.supplier_product_id === input.supplierProductId ||
      existingMetadata.cj_product_id === input.supplierProductId ||
      existingMetadata.external_id === input.supplierProductId;
    const ownedByFirstProductFlow = sameSupplierProduct || existingMetadata.supplierVerificationStatus === "draft_pending_verification" || existingMetadata.supplierVerificationStatus === "verified_for_checkout";
    if (!ownedByFirstProductFlow) {
      fail("product_handle_exists_but_is_not_managed_by_first_supplier_product_flow", {
        existingProductId: existingProduct.id,
        handle: input.handle,
        instruction: "Choose a new handle or manually review the existing product; this script will not overwrite unrelated products.",
      });
    }
    let inventoryLevelSynced = false;
    if (!dryRun) {
      await updateExistingProduct(container, existingProduct, input);
      const stockLocationsResult = await query({
        entity: "stock_location",
        fields: ["id", "name"],
        pagination: { take: 20 },
      });
      const stockLocation = asArray<any>(stockLocationsResult, ["stock_locations"])[0] || null;
      if (!stockLocation && input.mode === "publish") fail("no_stock_location_found_for_existing_product_publish");
      const variant = asArray<any>(existingProduct.variants)[0] || null;
      inventoryLevelSynced = await syncInventoryLevel(container, query, firstInventoryItemId(variant), stockLocation?.id, input.stockQty);
    }
    console.log(JSON.stringify({
      success: true,
      dryRun,
      mode: input.mode,
      createdCount: 0,
      updatedCount: dryRun ? 0 : 1,
      inventoryLevelSynced,
      existingProductId: existingProduct.id,
      handle: input.handle,
      metadataContract: metadata,
    }, null, 2));
    return;
  }

  const salesChannelsResult = await query({
    entity: "sales_channel",
    fields: ["id", "name", "is_default"],
    pagination: { take: 20 },
  });
  const salesChannels = asArray<any>(salesChannelsResult, ["sales_channels", "salesChannels"]);

  const shippingProfilesResult = await query({
    entity: "shipping_profile",
    fields: ["id", "name", "type"],
    pagination: { take: 20 },
  });
  const shippingProfiles = asArray<any>(shippingProfilesResult, ["shipping_profiles"]);

  const stockLocationsResult = await query({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { take: 20 },
  });
  const stockLocations = asArray<any>(stockLocationsResult, ["stock_locations"]);

  const defaultSalesChannel = salesChannels.find((sc: any) => sc?.is_default) || salesChannels[0] || null;
  const shippingProfile = shippingProfiles.find((sp: any) => sp?.type === "default") || shippingProfiles[0] || null;
  const stockLocation = stockLocations[0] || null;
  const diagnostics = {
    counts: {
      salesChannels: salesChannels.length,
      shippingProfiles: shippingProfiles.length,
      stockLocations: stockLocations.length,
    },
  };

  if (!defaultSalesChannel) fail("no_sales_channel_found", diagnostics);
  if (!shippingProfile) fail("no_shipping_profile_found", diagnostics);
  if (!stockLocation) fail("no_stock_location_found", diagnostics);

  const productInput = productInputFor(input, defaultSalesChannel.id, shippingProfile.id);

  if (dryRun) {
    logger.info(`First supplier product ${input.mode} dry-run for ${input.handle}`);
    console.log(JSON.stringify({ success: true, dryRun: true, mode: input.mode, wouldCreateCount: 1, product: productInput, diagnostics }, null, 2));
    return;
  }

  const created = await createProductsWorkflow(container).run({ input: { products: [productInput] } });
  const createdProduct = asArray<any>(created?.result)[0] || null;
  const variant = asArray<any>(createdProduct?.variants)[0] || null;
  const inventoryItemId = firstInventoryItemId(variant);
  const inventoryLevelCreated = await syncInventoryLevel(container, query, inventoryItemId, stockLocation.id, input.stockQty);

  console.log(JSON.stringify({
    success: true,
    mode: input.mode,
    createdCount: createdProduct ? 1 : 0,
    updatedCount: 0,
    productId: createdProduct?.id || null,
    variantId: variant?.id || null,
    inventoryLevelCreated,
    handle: input.handle,
    metadataContract: productInput.metadata,
  }, null, 2));
}
