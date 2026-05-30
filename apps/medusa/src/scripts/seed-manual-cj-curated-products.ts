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
import {
  ensurePublishableApiKey,
  KEY_TITLE,
} from "./ensure-publishable-api-key";
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
const LEGACY_OUTPUT_PATH_ENV = "MANUAL_CJ_CURATED_PRODUCTS_OUTPUT_PATH";
const LIVE_STOREFRONT_KEY_TITLE = "dBaronX Live Storefront Publishable Key";
const STOREFRONT_KEY_TITLE = KEY_TITLE;
const PUBLISHABLE_KEY_TITLES = [
  LIVE_STOREFRONT_KEY_TITLE,
  STOREFRONT_KEY_TITLE,
] as const;
const LIVE_SALES_CHANNEL_SOURCES = [
  "live_publishable_key_title",
  "live_storefront_publishable_key",
] as const;
const CANONICAL_ONLY_BLOCKERS = new Set([
  "publishable_key_not_linked_to_canonical_sales_channel",
  "first_cj_product_not_linked_to_canonical_sales_channel",
  "stock_location_not_linked_to_canonical_sales_channel",
  "shipping_option_not_visible_for_canonical_store_context",
]);
const TAG_MODE = "metadata_only";

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

const isLiveSalesChannelSource = (value: string | null | undefined) =>
  LIVE_SALES_CHANNEL_SOURCES.includes(
    value as (typeof LIVE_SALES_CHANNEL_SOURCES)[number],
  );

const medusaBaseUrl = () =>
  String(
    process.env.MEDUSA_BASE_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "",
  )
    .trim()
    .replace(/\/+$/, "");

const medusaPublishableKey = () =>
  String(process.env.MEDUSA_PUBLISHABLE_KEY || "").trim();

function emit(result: Record<string, unknown>, exitCode = 0): never {
  const json = JSON.stringify(result, null, 2);
  const outputPath = String(
    process.env[OUTPUT_PATH_ENV] || process.env[LEGACY_OUTPUT_PATH_ENV] || "",
  ).trim();
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

function tagValuesFor(product: ManualCjCuratedProduct) {
  const tags = new Set<string>([product.category, product.label]);
  if (product.category === "headphones") tags.add("electronics");
  if (product.category === "humidifier") tags.add("home-living");
  if (product.category === "apparel") tags.add("menswear");
  return Array.from(tags)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function definedTagIds(tags: Array<{ id?: string | null }> = []) {
  return tags
    .map((tag) => tag.id)
    .filter((id): id is string => typeof id === "string" && id.length > 0);
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
    shippingCountries: product.shippingCountries,
    deliveryEstimate: product.deliveryEstimate || null,
    label: product.label,
    category: product.category,
    searchTags: tagValuesFor(product),
    tagMode: TAG_MODE,
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
  if (product.supplierPriceMinorUsd <= 0)
    blockers.push("missing_supplier_price");
  if (product.shippingCostMinorUsd < 0) blockers.push("invalid_shipping_cost");
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
      String(metadata.supplierSku || "") === product.sku,
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
      "variants.prices.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "variants.manage_inventory",
      "variants.inventory_quantity",
      "thumbnail",
      "images.url",
      "sales_channels.id",
      "status",
    ],
    { handle },
    1,
  );
  return products[0] || null;
}

async function resolveLiveStorefrontSalesChannel(query: any) {
  const keys = await graph(
    query,
    "api_key",
    ["id", "title", "type", "sales_channels.id"],
    { type: "publishable" },
    100,
  );
  for (const title of PUBLISHABLE_KEY_TITLES) {
    const key = keys.find((candidate) => candidate.title === title);
    const salesChannelId = asArray<GraphRecord>(key?.sales_channels)
      .map(idOf)
      .find((id): id is string => Boolean(id));
    if (salesChannelId) {
      return {
        salesChannelId,
        salesChannelSource:
          title === LIVE_STOREFRONT_KEY_TITLE
            ? "live_publishable_key_title"
            : "live_storefront_publishable_key",
        publishableKeyTitleUsed: title,
      };
    }
  }
  return {
    salesChannelId: null,
    salesChannelSource: "live_publishable_key_missing",
    publishableKeyTitleUsed: null,
  };
}

async function resolveContext(container: ExecArgs["container"], query: any) {
  const key = await ensurePublishableApiKey(container);
  const shipping = await ensureShippingReadiness(container, { repair: true });
  const consistency = await ensureLaunchSalesChannelConsistency(container);
  const liveSalesChannel = await resolveLiveStorefrontSalesChannel(query);
  const salesChannels = await graph(query, "sales_channel", [
    "id",
    "name",
    "is_default",
  ]);
  const fallbackSalesChannelId =
    consistency.canonicalSalesChannelId ||
    key.salesChannelId ||
    shipping.salesChannelId ||
    null;
  const salesChannel =
    (liveSalesChannel.salesChannelId
      ? salesChannels.find(
          (channel) => idOf(channel) === liveSalesChannel.salesChannelId,
        )
      : null) ||
    salesChannels.find((channel) => idOf(channel) === fallbackSalesChannelId) ||
    salesChannels.find(
      (channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME,
    ) ||
    salesChannels.find((channel) => channel.is_default === true) ||
    salesChannels[0] ||
    null;
  const salesChannelId = idOf(salesChannel);
  const salesChannelSource = liveSalesChannel.salesChannelId
    ? liveSalesChannel.salesChannelSource
    : salesChannelId === fallbackSalesChannelId
      ? "canonical_or_publishable_fallback"
      : salesChannel?.name === DEFAULT_SALES_CHANNEL_NAME
        ? "default_named_sales_channel_fallback"
        : salesChannel?.is_default === true
          ? "default_flag_sales_channel_fallback"
          : "first_sales_channel_fallback";

  const shippingProfiles = await graph(query, "shipping_profile", [
    "id",
    "name",
    "type",
  ]);
  const shippingProfile =
    shippingProfiles.find(
      (profile) => idOf(profile) === shipping.shippingProfileId,
    ) ||
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
  const stockLocation =
    stockLocations.find(
      (location) => idOf(location) === consistency.stockLocationId,
    ) ||
    stockLocations.find(
      (location) => idOf(location) === shipping.stockLocationId,
    ) ||
    stockLocations.find(
      (location) => location.name === DEFAULT_STOCK_LOCATION_NAME,
    ) ||
    stockLocations.find((location) =>
      asArray<GraphRecord>(location.sales_channels).some(
        (channel) => idOf(channel) === salesChannelId,
      ),
    ) ||
    stockLocations[0] ||
    null;

  const blockers: string[] = [];
  const warnings: string[] = [];
  const liveSalesChannelResolved = Boolean(liveSalesChannel.salesChannelId);
  for (const blocker of [...key.blockers, ...shipping.blockers]) {
    pushUnique(blockers, blocker);
  }
  for (const blocker of consistency.blockers) {
    if (liveSalesChannelResolved && CANONICAL_ONLY_BLOCKERS.has(blocker)) {
      pushUnique(warnings, blocker);
      continue;
    }
    pushUnique(blockers, blocker);
  }
  if (!salesChannelId) pushUnique(blockers, "sales_channel_missing");
  if (!liveSalesChannel.salesChannelId) {
    pushUnique(
      blockers,
      "live_storefront_publishable_key_sales_channel_missing",
    );
  }
  if (
    liveSalesChannel.salesChannelId &&
    consistency.canonicalSalesChannelId &&
    consistency.canonicalSalesChannelId !== liveSalesChannel.salesChannelId
  ) {
    pushUnique(
      warnings,
      "canonical_sales_channel_differs_from_live_publishable_key_channel",
    );
  }
  if (!idOf(shippingProfile)) pushUnique(blockers, "shipping_profile_missing");
  if (!idOf(stockLocation)) pushUnique(blockers, "stock_location_missing");

  return {
    blockers,
    warnings,
    salesChannelId,
    salesChannelSource,
    shippingProfileId: idOf(shippingProfile),
    stockLocationId: idOf(stockLocation),
    publishableKeyTitleUsed: liveSalesChannel.publishableKeyTitleUsed,
    publishableKeyTitle: liveSalesChannel.publishableKeyTitleUsed,
    ensuredPublishableKeyTitle: KEY_TITLE,
    canonicalSalesChannelId: consistency.canonicalSalesChannelId,
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
    ) ||
    asArray<GraphRecord>(existing?.variants)[0] ||
    null;
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
    ) ||
    asArray<GraphRecord>(existing?.variants)[0] ||
    variant;
  return { action, product: existing, variant, blockers: [] };
}

function validateSeededProduct(
  productRecord: GraphRecord | null,
  variant: GraphRecord | null,
  inventoryReady: boolean,
  salesChannelId: string,
  sourceProduct: ManualCjCuratedProduct,
) {
  const blockers: string[] = [];
  const metadata = isRecord(productRecord?.metadata)
    ? productRecord.metadata
    : {};
  const variantMetadata = isRecord(variant?.metadata) ? variant.metadata : {};
  const prices = asArray<GraphRecord>(variant?.prices);
  const images = asArray<GraphRecord>(productRecord?.images);
  const salesChannels = asArray<GraphRecord>(productRecord?.sales_channels);
  const supplier = String(
    metadata.supplier || variantMetadata.supplier || "",
  ).toLowerCase();
  const supplierSku = String(
    metadata.supplierSku || variantMetadata.supplierSku || variant?.sku || "",
  );

  if (!idOf(productRecord)) pushUnique(blockers, "product_missing_after_seed");
  if (productRecord?.status !== "published")
    pushUnique(blockers, "product_not_published_after_seed");
  if (!idOf(variant)) pushUnique(blockers, "variant_missing_after_seed");
  if (
    !prices.some(
      (price) =>
        Number(price.amount || 0) > 0 &&
        String(price.currency_code || "").toLowerCase() === "usd",
    )
  ) {
    pushUnique(blockers, "usd_price_missing_after_seed");
  }
  if (!inventoryReady)
    pushUnique(blockers, "inventory_level_missing_after_seed");
  if (
    !productRecord?.thumbnail &&
    !images.some((image) => Boolean(image.url))
  ) {
    pushUnique(blockers, "product_image_missing_after_seed");
  }
  if (!salesChannels.some((channel) => idOf(channel) === salesChannelId)) {
    pushUnique(blockers, "live_sales_channel_link_missing_after_seed");
  }
  if (
    supplier !== "cj" ||
    supplierSku !== sourceProduct.sku ||
    metadata.realSupplierProduct !== true ||
    metadata.manualCurated !== true ||
    metadata.buyable !== true
  ) {
    pushUnique(blockers, "supplier_metadata_missing_after_seed");
  }
  return blockers;
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

async function proveStoreApiProductVisibility(products: ProductResult[]) {
  const token = medusaPublishableKey();
  if (!token) {
    return {
      storeApiProofReady: false,
      storeApiProofSkippedReason:
        "publishable_key_not_available_to_seed_runtime",
      blocker: null,
    };
  }
  const baseUrl = medusaBaseUrl();
  if (!baseUrl) {
    return {
      storeApiProofReady: false,
      storeApiProofSkippedReason: null,
      blocker: "medusa_base_url_not_available_to_seed_runtime",
    };
  }
  const firstSeeded = products.find(
    (product) => product.buyable && product.productId && product.handle,
  );
  if (!firstSeeded) {
    return {
      storeApiProofReady: false,
      storeApiProofSkippedReason: null,
      blocker: "store_api_product_visibility_no_seeded_product_to_check",
    };
  }
  try {
    const response = await fetch(
      `${baseUrl}/store/products?handle=${encodeURIComponent(firstSeeded.handle)}&limit=1`,
      {
        headers: { "x-publishable-api-key": token, accept: "application/json" },
      },
    );
    if (!response.ok) {
      return {
        storeApiProofReady: false,
        storeApiProofSkippedReason: null,
        blocker: "store_api_product_visibility_check_failed",
      };
    }
    const json = await response.json();
    const storeProducts = asArray<GraphRecord>(json, ["products"]);
    const visible = storeProducts.some(
      (product) =>
        product.handle === firstSeeded.handle ||
        idOf(product) === firstSeeded.productId,
    );
    return {
      storeApiProofReady: visible,
      storeApiProofSkippedReason: null,
      blocker: visible ? null : "store_api_product_visibility_missing",
    };
  } catch {
    return {
      storeApiProofReady: false,
      storeApiProofSkippedReason: null,
      blocker: "store_api_product_visibility_check_failed",
    };
  }
}

export default async function seedManualCjCuratedProducts({
  container,
}: ExecArgs) {
  const dryRun = process.env.DRY_RUN !== "false";
  const includeDrafts = process.env.DBX_INCLUDE_MANUAL_CJ_DRAFTS === "true";
  const totalInput = manualCjCuratedProducts.length;
  const buyableProducts = manualCjCuratedProducts.filter(
    (product) => product.buyable,
  );
  const draftProducts = manualCjCuratedProducts.filter(
    (product) => !product.buyable,
  );
  const selectedProducts = includeDrafts
    ? manualCjCuratedProducts
    : buyableProducts;
  const products: ProductResult[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

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
        salesChannelId: null,
        salesChannelSource: null,
        publishableKeyTitleUsed: null,
        salesChannelLinked: false,
        storeApiProofReady: false,
        storeApiProofSkippedReason: null,
        warnings,
        tagMode: TAG_MODE,
        productResults: [],
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
      totalBlocked: dryRunProducts.filter((product) => product.blockers.length)
        .length,
      salesChannelId: null,
      salesChannelSource: null,
      publishableKeyTitleUsed: null,
      salesChannelLinked: false,
      storeApiProofReady: false,
      storeApiProofSkippedReason: null,
      warnings,
      tagMode: TAG_MODE,
      productResults: [...products, ...dryRunProducts],
      products: [...products, ...dryRunProducts],
      blockers,
      nextManualStep:
        blockers.length === 0
          ? "Dry run passed. Rerun with dryRun=false to seed the manually verified CJ products; the incomplete draft remains non-buyable."
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
        totalBlocked: products.filter((product) => product.action === "blocked")
          .length,
        salesChannelId: null,
        salesChannelSource: null,
        publishableKeyTitleUsed: null,
        salesChannelLinked: false,
        storeApiProofReady: false,
        storeApiProofSkippedReason: null,
        warnings,
        tagMode: TAG_MODE,
        productResults: products,
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
  for (const warning of context.warnings) pushUnique(warnings, warning);
  if (
    !context.salesChannelId ||
    !context.shippingProfileId ||
    !context.stockLocationId
  ) {
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
        salesChannelId: context.salesChannelId,
        salesChannelSource: context.salesChannelSource,
        publishableKeyTitleUsed: context.publishableKeyTitleUsed,
        salesChannelLinked: false,
        storeApiProofReady: false,
        storeApiProofSkippedReason: null,
        warnings,
        tagMode: TAG_MODE,
        productResults: products,
        products,
        blockers,
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
    const productBlockers = validateSeededProduct(
      upsert.product,
      upsert.variant,
      inventoryReady,
      context.salesChannelId,
      product,
    );
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

  const salesChannelLinked = buyableProducts.every((sourceProduct) => {
    const result = products.find(
      (product) => product.buyable && product.sku === sourceProduct.sku,
    );
    return (
      Boolean(result?.productId) &&
      !result?.blockers.includes("live_sales_channel_link_missing_after_seed")
    );
  });
  if (!salesChannelLinked)
    pushUnique(blockers, "live_sales_channel_link_missing_after_seed");

  const storeApiProof = await proveStoreApiProductVisibility(products);
  if (storeApiProof.blocker) pushUnique(blockers, storeApiProof.blocker);

  const hasSeededOrUpdatedProducts = totalSeeded + totalUpdated > 0;
  const success =
    blockers.length === 0 &&
    totalBlocked === 0 &&
    salesChannelLinked &&
    hasSeededOrUpdatedProducts &&
    (storeApiProof.storeApiProofReady ||
      storeApiProof.storeApiProofSkippedReason ===
        "publishable_key_not_available_to_seed_runtime");
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
      salesChannelId: context.salesChannelId,
      salesChannelSource: context.salesChannelSource,
      publishableKeyTitleUsed: context.publishableKeyTitleUsed,
      salesChannelLinked,
      storeApiProofReady: storeApiProof.storeApiProofReady,
      storeApiProofSkippedReason: storeApiProof.storeApiProofSkippedReason,
      warnings,
      tagMode: TAG_MODE,
      productResults: products,
      products,
      blockers,
      stockLocationId: context.stockLocationId,
      ensuredPublishableKeyTitle: context.ensuredPublishableKeyTitle,
      nextManualStep: success
        ? "Run the manual curated products smoke and first-sale readiness. The draft humidifier remains non-buyable until completed."
        : "Resolve fatal blockers, then rerun this manual curated seed. Warnings do not block deploy, but do not mark blocked products buyable.",
    },
    success ? 0 : 1,
  );
}
