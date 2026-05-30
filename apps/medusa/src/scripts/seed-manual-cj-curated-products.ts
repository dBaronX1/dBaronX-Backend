import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createInventoryLevelsWorkflow,
  createProductVariantsWorkflow,
  createProductsWorkflow,
  linkProductsToSalesChannelWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows";

import { ensureVariantInventoryLink } from "./ensure-variant-inventory-link";
import { ensureLaunchSalesChannelConsistency } from "./ensure-launch-sales-channel-consistency";
import { ensurePublishableApiKey, KEY_TITLE } from "./ensure-publishable-api-key";
import {
  DEFAULT_SALES_CHANNEL_NAME,
  DEFAULT_SHIPPING_PROFILE_NAME,
  DEFAULT_STOCK_LOCATION_NAME,
  ensureShippingReadiness,
} from "./shipping-readiness";
import {
  manualCjCuratedProducts,
  type ManualCjCuratedProduct,
} from "./data/manual-cj-curated-products";

const CONFIRM_ENV = "DBX_CONFIRM_MANUAL_CJ_CURATED_SEED";
const OUTPUT_PATH_ENV = "DBX_MANUAL_CJ_CURATED_PRODUCTS_OUTPUT_PATH";

type GraphRecord = Record<string, unknown>;
type ProductResult = {
  sku: string;
  handle: string;
  title: string;
  buyable: boolean;
  action: "seeded" | "updated" | "skipped" | "blocked" | "dry_run";
  productId: string | null;
  variantId: string | null;
  blockers: string[];
};

const isRecord = (value: unknown): value is GraphRecord =>
  typeof value === "object" && value !== null;

const asArray = <T = GraphRecord>(
  value: unknown,
  fallbackKeys: string[] = [],
): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!isRecord(value)) return [];
  for (const key of ["data", ...fallbackKeys]) {
    const nested = value[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const idOf = (value: unknown): string | null =>
  isRecord(value) && typeof value.id === "string" ? value.id : null;

function pushUnique(values: string[], value: string | null | undefined) {
  if (value && !values.includes(value)) values.push(value);
}

function emit(result: Record<string, unknown>, exitCode = 0): never {
  const json = JSON.stringify(result, null, 2);
  const outputPath = String(process.env[OUTPUT_PATH_ENV] || "").trim();
  if (outputPath) {
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${json}\n`, { encoding: "utf8" });
  }
  console.log(json);
  process.exit(exitCode);
}

async function graph(
  query: any,
  entity: string,
  fields: string[],
  filters?: Record<string, unknown>,
  take = 100,
) {
  const result = await query.graph({
    entity,
    fields,
    ...(filters ? { filters } : {}),
    pagination: { take },
  });
  return asArray<GraphRecord>(result, [entity, `${entity}s`]);
}

function tagsFor(product: ManualCjCuratedProduct) {
  const tags = new Set<string>([product.category]);
  if (product.category === "headphones") tags.add("electronics");
  if (product.category === "humidifier") tags.add("home-living");
  return Array.from(tags).map((value) => ({ value }));
}

function publicDescription(product: ManualCjCuratedProduct) {
  const delivery = product.deliveryEstimate
    ? ` Estimated delivery: ${product.deliveryEstimate}.`
    : "";
  return `${product.title} manually verified from CJ Dropshipping for the dBaronX checkout catalog.${delivery}`;
}

function metadataFor(product: ManualCjCuratedProduct) {
  const blockers = product.buyable ? [] : product.blockers || [];
  return {
    supplier: product.supplier,
    supplierProductId: product.sku,
    supplierSku: product.sku,
    sourceUrl: product.productUrl,
    productUrl: product.productUrl,
    imageUrl: product.imageUrl || null,
    videoUrl: product.videoUrl || null,
    supplierCostAmount: product.supplierPriceMinorUsd,
    supplierCostCurrency: "usd",
    supplierCostUsdMinor: product.supplierPriceMinorUsd,
    supplierPriceMinorUsd: product.supplierPriceMinorUsd,
    shippingCostMinorUsd: product.shippingCostMinorUsd,
    totalCostMinorUsd: product.totalCostMinorUsd,
    shippingWarehouse: product.shippingWarehouse,
    shippingDestination: product.shippingDestination,
    shippingCountries: ["AE"],
    deliveryEstimate: product.deliveryEstimate || null,
    label: product.label,
    category: product.category,
    realSupplierProduct: product.realSupplierProduct,
    demo: product.demo,
    manualCurated: product.manualCurated,
    buyable: product.buyable,
    supplierVerificationStatus: product.supplierVerificationStatus,
    supplierVerificationBlockers: blockers,
    blockers,
  };
}

function productInput(
  product: ManualCjCuratedProduct,
  salesChannelId: string,
  shippingProfileId: string,
) {
  const metadata = metadataFor(product);
  return {
    title: product.title,
    description: publicDescription(product),
    handle: product.handle,
    status: "published" as const,
    thumbnail: product.imageUrl,
    images: [{ url: product.imageUrl }],
    tags: tagsFor(product),
    metadata,
    sales_channels: [{ id: salesChannelId }],
    shipping_profile_id: shippingProfileId,
    options: [{ title: "Variant", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: product.sku,
        manage_inventory: true,
        prices: [
          { amount: product.sellingPriceMinorUsd, currency_code: "usd" },
        ],
        options: { Variant: "Default" },
        metadata,
      },
    ],
  };
}

function validateBuyable(product: ManualCjCuratedProduct): string[] {
  const blockers: string[] = [];
  if (product.supplier !== "cj") blockers.push("supplier_must_be_cj");
  if (!product.sku) blockers.push("missing_sku");
  if (!product.title) blockers.push("missing_title");
  if (!product.handle) blockers.push("missing_handle");
  if (!product.productUrl) blockers.push("missing_product_url");
  if (!product.imageUrl) blockers.push("missing_image");
  if (product.inventory <= 0) blockers.push("missing_inventory");
  if (product.supplierPriceMinorUsd <= 0) blockers.push("missing_supplier_price");
  if (product.shippingCostMinorUsd <= 0) blockers.push("missing_shipping_cost");
  if (product.sellingPriceMinorUsd <= 0) blockers.push("missing_selling_price");
  if (product.sellingPriceMinorUsd <= product.totalCostMinorUsd)
    blockers.push("selling_price_must_exceed_total_cost");
  if (!product.deliveryEstimate) blockers.push("missing_delivery_estimate");
  if (product.supplierVerificationStatus !== "manual_verified_for_checkout")
    blockers.push("not_manual_verified_for_checkout");
  return blockers;
}

function sameManualCjProduct(
  existingProduct: GraphRecord | null,
  product: ManualCjCuratedProduct,
) {
  if (!existingProduct) return false;
  const candidates = [
    isRecord(existingProduct.metadata) ? existingProduct.metadata : null,
    ...asArray<GraphRecord>(existingProduct.variants).map((variant) =>
      isRecord(variant.metadata) ? variant.metadata : null,
    ),
  ].filter((item): item is GraphRecord => Boolean(item));
  return candidates.some(
    (metadata) =>
      String(metadata.supplier || "").toLowerCase() === "cj" &&
      String(metadata.supplierSku || "") === product.sku &&
      metadata.manualCurated === true,
  );
}

async function findProductByHandle(query: any, handle: string) {
  const products = await graph(
    query,
    "product",
    [
      "id",
      "title",
      "handle",
      "metadata",
      "variants.id",
      "variants.sku",
      "variants.metadata",
    ],
    { handle },
    1,
  );
  return products[0] || null;
}

async function resolveContext(container: ExecArgs["container"], query: any) {
  const key = await ensurePublishableApiKey(container);
  const shipping = await ensureShippingReadiness(container, { repair: true });
  const consistency = await ensureLaunchSalesChannelConsistency(container);
  const salesChannels = await graph(
    query,
    "sales_channel",
    ["id", "name", "is_default"],
  );
  const canonicalSalesChannelId =
    consistency.canonicalSalesChannelId || key.salesChannelId || null;
  const salesChannel =
    salesChannels.find((channel) => idOf(channel) === canonicalSalesChannelId) ||
    salesChannels.find((channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME) ||
    salesChannels.find((channel) => channel.is_default === true) ||
    salesChannels[0] ||
    null;

  const shippingProfiles = await graph(query, "shipping_profile", [
    "id",
    "name",
    "type",
  ]);
  const shippingProfile =
    shippingProfiles.find((profile) => idOf(profile) === shipping.shippingProfileId) ||
    shippingProfiles.find(
      (profile) => profile.name === DEFAULT_SHIPPING_PROFILE_NAME,
    ) ||
    shippingProfiles.find((profile) => profile.type === "default") ||
    shippingProfiles[0] ||
    null;

  const stockLocations = await graph(query, "stock_location", [
    "id",
    "name",
    "sales_channels.id",
  ]);
  const salesChannelId = idOf(salesChannel);
  const stockLocation =
    stockLocations.find((location) => idOf(location) === consistency.stockLocationId) ||
    stockLocations.find((location) => idOf(location) === shipping.stockLocationId) ||
    stockLocations.find((location) => location.name === DEFAULT_STOCK_LOCATION_NAME) ||
    stockLocations.find((location) =>
      asArray<GraphRecord>(location.sales_channels).some(
        (channel) => idOf(channel) === salesChannelId,
      ),
    ) ||
    stockLocations[0] ||
    null;

  const blockers: string[] = [];
  for (const blocker of [
    ...key.blockers,
    ...shipping.blockers,
    ...consistency.blockers,
  ]) {
    pushUnique(blockers, blocker);
  }
  if (!salesChannelId) pushUnique(blockers, "sales_channel_missing");
  if (!idOf(shippingProfile)) pushUnique(blockers, "shipping_profile_missing");
  if (!idOf(stockLocation)) pushUnique(blockers, "stock_location_missing");

  return {
    blockers,
    salesChannelId,
    shippingProfileId: idOf(shippingProfile),
    stockLocationId: idOf(stockLocation),
    publishableKeyTitle: KEY_TITLE,
  };
}

async function createOrUpdateProduct(
  container: ExecArgs["container"],
  query: any,
  product: ManualCjCuratedProduct,
  salesChannelId: string,
  shippingProfileId: string,
) {
  let existing = await findProductByHandle(query, product.handle);
  if (existing && !sameManualCjProduct(existing, product)) {
    return {
      action: "blocked" as const,
      product: existing,
      variant: null,
      blockers: ["handle_exists_with_unrelated_product"],
    };
  }

  const input = productInput(product, salesChannelId, shippingProfileId);
  let action: "seeded" | "updated" = "updated";
  if (!existing) {
    const created = await createProductsWorkflow(container).run({
      input: { products: [input] },
    });
    existing = asArray<GraphRecord>(created.result)[0] || null;
    action = "seeded";
  } else {
    const { variants: _variants, ...productUpdate } = input;
    await updateProductsWorkflow(container).run({
      input: { products: [{ id: String(existing.id), ...productUpdate }] },
    });
    await linkProductsToSalesChannelWorkflow(container).run({
      input: { id: salesChannelId, add: [String(existing.id)] },
    });
  }

  existing = await findProductByHandle(query, product.handle);
  let variant =
    asArray<GraphRecord>(existing?.variants).find(
      (item) => item.sku === product.sku,
    ) || asArray<GraphRecord>(existing?.variants)[0] || null;
  const metadata = metadataFor(product);
  if (variant?.id) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            id: String(variant.id),
            title: "Default",
            sku: product.sku,
            manage_inventory: true,
            prices: [
              { amount: product.sellingPriceMinorUsd, currency_code: "usd" },
            ],
            metadata,
          },
        ],
      },
    });
  } else if (existing?.id) {
    const createdVariant = await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            product_id: String(existing.id),
            title: "Default",
            sku: product.sku,
            manage_inventory: true,
            prices: [
              { amount: product.sellingPriceMinorUsd, currency_code: "usd" },
            ],
            options: { Variant: "Default" },
            metadata,
          },
        ],
      },
    });
    variant = asArray<GraphRecord>(createdVariant.result)[0] || null;
  }

  existing = await findProductByHandle(query, product.handle);
  variant =
    asArray<GraphRecord>(existing?.variants).find(
      (item) => item.sku === product.sku,
    ) || asArray<GraphRecord>(existing?.variants)[0] || variant;
  return { action, product: existing, variant, blockers: [] };
}

async function syncInventory(
  container: ExecArgs["container"],
  query: any,
  variantId: string | null,
  stockLocationId: string,
  stockQty: number,
) {
  if (!variantId || stockQty <= 0) return false;
  const link = await ensureVariantInventoryLink(container, variantId);
  if (!link.inventoryItemId) return false;
  const levels = await graph(
    query,
    "inventory_level",
    ["id", "inventory_item_id", "location_id", "stocked_quantity"],
    { inventory_item_id: link.inventoryItemId, location_id: stockLocationId },
    1,
  );
  const level = levels[0] || null;
  if (level?.id) {
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates: [
          {
            id: String(level.id),
            inventory_item_id: link.inventoryItemId,
            location_id: stockLocationId,
            stocked_quantity: stockQty,
          },
        ],
      },
    });
    return true;
  }
  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: [
        {
          inventory_item_id: link.inventoryItemId,
          location_id: stockLocationId,
          stocked_quantity: stockQty,
        },
      ],
    },
  });
  return true;
}

export default async function seedManualCjCuratedProducts({ container }: ExecArgs) {
  const dryRun = process.env.DRY_RUN !== "false";
  const includeDrafts = process.env.DBX_INCLUDE_MANUAL_CJ_DRAFTS === "true";
  const totalInput = manualCjCuratedProducts.length;
  const buyableProducts = manualCjCuratedProducts.filter((product) => product.buyable);
  const draftProducts = manualCjCuratedProducts.filter((product) => !product.buyable);
  const selectedProducts = includeDrafts
    ? manualCjCuratedProducts
    : buyableProducts;
  const products: ProductResult[] = [];
  const blockers: string[] = [];

  if (process.env[CONFIRM_ENV] !== "true") {
    pushUnique(blockers, `${CONFIRM_ENV}_required`);
    emit(
      {
        success: false,
        mode: "manual_cj_curated_products",
        dryRun,
        totalInput,
        totalBuyableInput: buyableProducts.length,
        totalDraftInput: draftProducts.length,
        totalSeeded: 0,
        totalUpdated: 0,
        totalSkipped: 0,
        totalBlocked: 1,
        products: [],
        blockers,
        nextManualStep: `Rerun with ${CONFIRM_ENV}=true after confirming these manually curated CJ products should be seeded to Medusa.`,
      },
      1,
    );
  }

  for (const draft of draftProducts) {
    products.push({
      sku: draft.sku,
      handle: draft.handle,
      title: draft.title,
      buyable: false,
      action: "skipped",
      productId: null,
      variantId: null,
      blockers: draft.blockers || [],
    });
  }

  for (const product of selectedProducts) {
    if (!product.buyable) continue;
    const productBlockers = validateBuyable(product);
    if (productBlockers.length) {
      products.push({
        sku: product.sku,
        handle: product.handle,
        title: product.title,
        buyable: product.buyable,
        action: "blocked",
        productId: null,
        variantId: null,
        blockers: productBlockers,
      });
      for (const blocker of productBlockers) pushUnique(blockers, blocker);
    }
  }

  if (dryRun) {
    const dryRunProducts = selectedProducts
      .filter((product) => product.buyable)
      .map((product) => ({
        sku: product.sku,
        handle: product.handle,
        title: product.title,
        buyable: product.buyable,
        action: "dry_run" as const,
        productId: null,
        variantId: null,
        blockers: validateBuyable(product),
      }));
    emit({
      success: blockers.length === 0,
      mode: "manual_cj_curated_products",
      dryRun,
      totalInput,
      totalBuyableInput: buyableProducts.length,
      totalDraftInput: draftProducts.length,
      totalSeeded: 0,
      totalUpdated: 0,
      totalSkipped: draftProducts.length,
      totalBlocked: dryRunProducts.filter((product) => product.blockers.length).length,
      products: [...products, ...dryRunProducts],
      blockers,
      nextManualStep:
        blockers.length === 0
          ? "Dry run passed. Rerun with dryRun=false to seed the 7 manually verified CJ products; the incomplete draft remains non-buyable."
          : "Resolve manual curated product blockers before running the real seed.",
    });
  }

  if (blockers.length) {
    emit(
      {
        success: false,
        mode: "manual_cj_curated_products",
        dryRun,
        totalInput,
        totalBuyableInput: buyableProducts.length,
        totalDraftInput: draftProducts.length,
        totalSeeded: 0,
        totalUpdated: 0,
        totalSkipped: draftProducts.length,
        totalBlocked: products.filter((product) => product.action === "blocked").length,
        products,
        blockers,
        nextManualStep:
          "Resolve manual curated product blockers before running the real seed.",
      },
      1,
    );
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const context = await resolveContext(container, query);
  for (const blocker of context.blockers) pushUnique(blockers, blocker);
  if (!context.salesChannelId || !context.shippingProfileId || !context.stockLocationId) {
    emit(
      {
        success: false,
        mode: "manual_cj_curated_products",
        dryRun,
        totalInput,
        totalBuyableInput: buyableProducts.length,
        totalDraftInput: draftProducts.length,
        totalSeeded: 0,
        totalUpdated: 0,
        totalSkipped: draftProducts.length,
        totalBlocked: 1,
        products,
        blockers,
        publishableKeyTitle: context.publishableKeyTitle,
        nextManualStep:
          "Run Medusa commerce prerequisite repair, then rerun the manual CJ curated seed.",
      },
      1,
    );
  }

  let totalSeeded = 0;
  let totalUpdated = 0;
  let totalBlocked = 0;
  for (const product of buyableProducts) {
    const upsert = await createOrUpdateProduct(
      container,
      query,
      product,
      context.salesChannelId,
      context.shippingProfileId,
    );
    if (upsert.action === "blocked") {
      totalBlocked += 1;
      products.push({
        sku: product.sku,
        handle: product.handle,
        title: product.title,
        buyable: true,
        action: "blocked",
        productId: idOf(upsert.product),
        variantId: null,
        blockers: upsert.blockers,
      });
      for (const blocker of upsert.blockers) pushUnique(blockers, blocker);
      continue;
    }
    const inventoryReady = await syncInventory(
      container,
      query,
      idOf(upsert.variant),
      context.stockLocationId,
      product.inventory,
    );
    const productBlockers: string[] = [];
    if (!idOf(upsert.product)) pushUnique(productBlockers, "product_missing_after_seed");
    if (!idOf(upsert.variant)) pushUnique(productBlockers, "variant_missing_after_seed");
    if (!inventoryReady) pushUnique(productBlockers, "inventory_level_missing_after_seed");
    if (upsert.action === "seeded") totalSeeded += 1;
    if (upsert.action === "updated") totalUpdated += 1;
    if (productBlockers.length) totalBlocked += 1;
    for (const blocker of productBlockers) pushUnique(blockers, blocker);
    products.push({
      sku: product.sku,
      handle: product.handle,
      title: product.title,
      buyable: true,
      action: productBlockers.length ? "blocked" : upsert.action,
      productId: idOf(upsert.product),
      variantId: idOf(upsert.variant),
      blockers: productBlockers,
    });
  }

  const success = blockers.length === 0 && totalBlocked === 0;
  emit(
    {
      success,
      mode: "manual_cj_curated_products",
      dryRun,
      totalInput,
      totalBuyableInput: buyableProducts.length,
      totalDraftInput: draftProducts.length,
      totalSeeded,
      totalUpdated,
      totalSkipped: draftProducts.length,
      totalBlocked,
      products,
      blockers,
      salesChannelId: context.salesChannelId,
      stockLocationId: context.stockLocationId,
      publishableKeyTitle: context.publishableKeyTitle,
      nextManualStep: success
        ? "Run the manual curated products smoke and first-sale readiness. The draft humidifier remains non-buyable until completed."
        : "Resolve blockers, then rerun this manual curated seed. Do not mark blocked products buyable.",
    },
    success ? 0 : 1,
  );
}
