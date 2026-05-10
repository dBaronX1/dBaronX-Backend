import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

type QueryGraphResult = Record<string, unknown> | unknown[] | null | undefined;
type QueryGraphFn = (input: {
  entity: string;
  fields: string[];
  filters?: Record<string, unknown>;
  pagination?: Record<string, unknown>;
}) => Promise<QueryGraphResult>;

type FirstProductInput = {
  title: string;
  handle: string;
  description: string;
  priceAmount: number;
  supplier: string;
  supplierProductId: string;
  supplierSku: string;
  sourceUrl: string;
  imageUrl: string;
  stockQty: number;
};

const REQUIRED_ENV = [
  "DBX_FIRST_PRODUCT_TITLE",
  "DBX_FIRST_PRODUCT_HANDLE",
  "DBX_FIRST_PRODUCT_DESCRIPTION",
  "DBX_FIRST_PRODUCT_PRICE_USD_MINOR",
  "DBX_FIRST_PRODUCT_SUPPLIER",
  "DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID",
  "DBX_FIRST_PRODUCT_SUPPLIER_SKU",
  "DBX_FIRST_PRODUCT_SOURCE_URL",
  "DBX_FIRST_PRODUCT_IMAGE_URL",
  "DBX_FIRST_PRODUCT_STOCK_QTY",
] as const;

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

function env(name: (typeof REQUIRED_ENV)[number]): string {
  return String(process.env[name] || "").trim();
}

function fail(error: string, details: Record<string, unknown> = {}): never {
  console.error(JSON.stringify({ success: false, error, ...details }, null, 2));
  process.exit(1);
}

function parsePositiveInteger(raw: string, name: string): number {
  if (!/^\d+$/.test(raw)) fail(`${name}_must_be_integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value <= 0) fail(`${name}_must_be_positive`);
  return value;
}

function parseNonNegativeInteger(raw: string, name: string): number {
  if (!/^\d+$/.test(raw)) fail(`${name}_must_be_integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) fail(`${name}_must_be_non_negative`);
  return value;
}

function assertUrl(value: string, name: string): void {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) fail(`${name}_must_be_http_url`);
  } catch {
    fail(`${name}_must_be_valid_url`);
  }
}

function containsDemoMarker(value: string): boolean {
  return /\b(demo|sample|mock|test product)\b/i.test(value);
}

function readInput(): FirstProductInput {
  const missing = REQUIRED_ENV.filter((name) => !env(name));
  if (missing.length) fail("first_real_product_required_env_missing", { missing });

  const input: FirstProductInput = {
    title: env("DBX_FIRST_PRODUCT_TITLE"),
    handle: env("DBX_FIRST_PRODUCT_HANDLE"),
    description: env("DBX_FIRST_PRODUCT_DESCRIPTION"),
    priceAmount: parsePositiveInteger(env("DBX_FIRST_PRODUCT_PRICE_USD_MINOR"), "DBX_FIRST_PRODUCT_PRICE_USD_MINOR"),
    supplier: env("DBX_FIRST_PRODUCT_SUPPLIER"),
    supplierProductId: env("DBX_FIRST_PRODUCT_SUPPLIER_PRODUCT_ID"),
    supplierSku: env("DBX_FIRST_PRODUCT_SUPPLIER_SKU"),
    sourceUrl: env("DBX_FIRST_PRODUCT_SOURCE_URL"),
    imageUrl: env("DBX_FIRST_PRODUCT_IMAGE_URL"),
    stockQty: parseNonNegativeInteger(env("DBX_FIRST_PRODUCT_STOCK_QTY"), "DBX_FIRST_PRODUCT_STOCK_QTY"),
  };

  assertUrl(input.sourceUrl, "DBX_FIRST_PRODUCT_SOURCE_URL");
  assertUrl(input.imageUrl, "DBX_FIRST_PRODUCT_IMAGE_URL");

  if (containsDemoMarker(`${input.title} ${input.handle} ${input.supplier} ${input.supplierProductId} ${input.supplierSku}`)) {
    fail("first_real_product_must_not_use_demo_sample_mock_or_test_markers");
  }
  if (input.stockQty <= 0) fail("DBX_FIRST_PRODUCT_STOCK_QTY_must_prove_available_stock");

  return input;
}

export default async function seedFirstRealSupplierProduct({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve<QueryGraphFn>(ContainerRegistrationKeys.QUERY);
  const dryRun = process.argv.includes("--dry-run") || process.argv.includes("--dryRun") || process.env.DRY_RUN === "true";
  const input = readInput();

  const existingProductsResult = await query({
    entity: "product",
    fields: ["id", "handle", "metadata"],
    filters: { handle: input.handle },
    pagination: { take: 1 },
  });
  const existingProduct = asArray<any>(existingProductsResult, ["products"])[0] || null;
  if (existingProduct) {
    const metadata = existingProduct.metadata && typeof existingProduct.metadata === "object" ? existingProduct.metadata : {};
    const isRealSupplierProduct = metadata.realSupplierProduct === true && metadata.demo === false;
    if (!isRealSupplierProduct) {
      fail("product_handle_exists_but_is_not_first_real_supplier_product", {
        existingProductId: existingProduct.id,
        handle: input.handle,
        instruction: "Choose a new handle or manually review the existing product; this script will not replace demo/non-real products.",
      });
    }
    console.log(JSON.stringify({ success: true, dryRun, createdCount: 0, skippedCount: 1, existingProductId: existingProduct.id, handle: input.handle, realSupplierProduct: true }, null, 2));
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

  const productInput = {
    title: input.title,
    description: input.description,
    handle: input.handle,
    thumbnail: input.imageUrl,
    images: [{ url: input.imageUrl }],
    status: "published" as const,
    sales_channels: [{ id: defaultSalesChannel.id }],
    shipping_profile_id: shippingProfile.id,
    options: [{ title: "Variant", values: ["Default"] }],
    metadata: {
      supplier: input.supplier,
      supplierProductId: input.supplierProductId,
      supplierSku: input.supplierSku,
      sourceUrl: input.sourceUrl,
      realSupplierProduct: true,
      demo: false,
    },
    variants: [
      {
        title: "Default",
        sku: input.supplierSku,
        manage_inventory: true,
        prices: [{ amount: input.priceAmount, currency_code: "usd" }],
        options: { Variant: "Default" },
        metadata: {
          supplier: input.supplier,
          supplierProductId: input.supplierProductId,
          supplierSku: input.supplierSku,
          sourceUrl: input.sourceUrl,
          realSupplierProduct: true,
          demo: false,
        },
      },
    ],
  };

  if (dryRun) {
    logger.info(`First real supplier product dry-run for ${input.handle}`);
    console.log(JSON.stringify({ success: true, dryRun: true, wouldCreateCount: 1, product: productInput, diagnostics }, null, 2));
    return;
  }

  const created = await createProductsWorkflow(container).run({ input: { products: [productInput] } });
  const createdProduct = asArray<any>(created?.result)[0] || null;
  const variant = asArray<any>(createdProduct?.variants)[0] || null;
  const inventoryItemId = asArray<any>(variant?.inventory_items)[0]?.id;
  if (inventoryItemId) {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: [{ inventory_item_id: inventoryItemId, location_id: stockLocation.id, stocked_quantity: input.stockQty }],
      },
    });
  }

  console.log(JSON.stringify({
    success: true,
    createdCount: createdProduct ? 1 : 0,
    productId: createdProduct?.id || null,
    variantId: variant?.id || null,
    inventoryLevelCreated: Boolean(inventoryItemId),
    handle: input.handle,
    metadataContract: productInput.metadata,
  }, null, 2));
}
