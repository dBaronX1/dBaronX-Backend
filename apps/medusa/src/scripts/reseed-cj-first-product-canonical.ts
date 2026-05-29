import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createProductVariantsWorkflow,
  createProductsWorkflow,
  linkProductsToSalesChannelWorkflow,
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
  metadataFor,
  type FirstProductInput,
} from "./seed-first-real-supplier-product";

const CONFIRM_ENV = "DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED";
const TARGET: FirstProductInput = {
  mode: "publish",
  title: "Men's Cotton Linen Long Sleeve Casual Shirt",
  handle: "mens-cotton-linen-long-sleeve-casual-shirt",
  description:
    "A breathable cotton linen long sleeve casual shirt for men's spring and autumn outfits.",
  priceAmount: 1999,
  supplierCostAmount: 419,
  supplier: "cj",
  supplierProductId: "2408300732091605000",
  supplierSku: "CJDS212420104DW",
  sourceUrl:
    "https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html",
  imageUrl:
    "https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp",
  stockQty: 32,
  shippingCountries: ["US"],
  deliveryEstimate: "7-15 business days",
  verificationBlockers: [],
};

type GraphResult = Record<string, unknown> | unknown[] | null | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T = Record<string, unknown>>(
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


function exactTargetMetadataPresent(product: Record<string, unknown> | null): boolean {
  if (!product) return false;
  const candidates = [
    isRecord(product.metadata) ? product.metadata : null,
    ...asArray<Record<string, unknown>>(product.variants).map((variant) =>
      isRecord(variant.metadata) ? variant.metadata : null,
    ),
  ].filter((item): item is Record<string, unknown> => Boolean(item));
  return candidates.some((metadata) =>
    String(metadata.supplier || "").toLowerCase() === TARGET.supplier &&
    String(metadata.supplierProductId || "") === TARGET.supplierProductId &&
    String(metadata.supplierSku || "") === TARGET.supplierSku &&
    (!metadata.sourceUrl || String(metadata.sourceUrl) === TARGET.sourceUrl)
  );
}

function assertSafeToRepairExistingProduct(product: Record<string, unknown> | null): void {
  if (!product || exactTargetMetadataPresent(product)) return;
  console.error(JSON.stringify({
    success: false,
    blockers: ["product_handle_exists_with_different_or_unverified_supplier_metadata"],
    productId: idOf(product),
    handle: TARGET.handle,
    requiredSupplier: TARGET.supplier,
    requiredSupplierProductId: TARGET.supplierProductId,
    requiredSupplierSku: TARGET.supplierSku,
    nextManualStep: "Manually review the existing Medusa product. This seed will not relabel unrelated products or demo products unless exact CJ metadata proves identity.",
  }, null, 2));
  process.exit(1);
}

function pushUnique(values: string[], value: string | null | undefined) {
  if (value && !values.includes(value)) values.push(value);
}

async function graph(
  query: any,
  entity: string,
  fields: string[],
  filters?: Record<string, unknown>,
  take = 100,
) {
  const result: GraphResult = await query.graph({
    entity,
    fields,
    ...(filters ? { filters } : {}),
    pagination: { take },
  });
  return asArray<Record<string, unknown>>(result, [entity, `${entity}s`]);
}

async function findProductByHandle(query: any) {
  const products = await graph(
    query,
    "product",
    [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "metadata",
      "sales_channels.id",
      "variants.id",
      "variants.sku",
      "variants.metadata",
      "variants.inventory_items.id",
      "variants.inventory_items.inventory_item_id",
      "variants.inventory_items.inventory.id",
    ],
    { handle: TARGET.handle },
    1,
  );
  return products[0] || null;
}

async function resolveCanonicalContext(container: ExecArgs["container"], query: any) {
  const key = await ensurePublishableApiKey(container);
  const shipping = await ensureShippingReadiness(container, { repair: true });
  const consistency = await ensureLaunchSalesChannelConsistency(container);
  const salesChannels = await graph(query, "sales_channel", ["id", "name", "is_default"], undefined, 100);
  const canonicalSalesChannel =
    salesChannels.find((channel) => idOf(channel) === consistency.canonicalSalesChannelId) ||
    salesChannels.find((channel) => idOf(channel) === key.salesChannelId) ||
    salesChannels.find((channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME) ||
    salesChannels.find((channel) => channel.is_default === true) ||
    salesChannels[0] ||
    null;

  const regions = await graph(query, "region", ["id", "name", "currency_code", "countries.iso_2"], undefined, 100);
  const region =
    regions.find((item) => idOf(item) === shipping.regionId) ||
    regions.find((item) => String(item.currency_code || "").toLowerCase() === "usd") ||
    regions[0] ||
    null;

  const shippingProfiles = await graph(query, "shipping_profile", ["id", "name", "type"], undefined, 100);
  const shippingProfile =
    shippingProfiles.find((profile) => idOf(profile) === shipping.shippingProfileId) ||
    shippingProfiles.find((profile) => profile.name === DEFAULT_SHIPPING_PROFILE_NAME) ||
    shippingProfiles.find((profile) => profile.type === "default") ||
    shippingProfiles[0] ||
    null;

  const stockLocations = await graph(query, "stock_location", ["id", "name", "sales_channels.id"], undefined, 100);
  const canonicalSalesChannelId = idOf(canonicalSalesChannel);
  const stockLocation =
    stockLocations.find((location) => idOf(location) === consistency.stockLocationId) ||
    stockLocations.find((location) => idOf(location) === shipping.stockLocationId) ||
    stockLocations.find((location) =>
      asArray<Record<string, unknown>>(location.sales_channels).some((channel) => idOf(channel) === canonicalSalesChannelId),
    ) ||
    stockLocations.find((location) => location.name === DEFAULT_STOCK_LOCATION_NAME) ||
    stockLocations[0] ||
    null;

  const apiKeys = await graph(query, "api_key", ["id", "title", "token", "type", "sales_channels.id"], { type: "publishable" }, 100);
  const publishableKey =
    apiKeys.find((candidate) => candidate.title === KEY_TITLE) ||
    apiKeys.find((candidate) =>
      asArray<Record<string, unknown>>(candidate.sales_channels).some((channel) => idOf(channel) === canonicalSalesChannelId),
    ) ||
    apiKeys[0] ||
    null;

  return {
    key,
    shipping,
    consistency,
    canonicalSalesChannelId,
    regionId: idOf(region),
    shippingProfileId: idOf(shippingProfile),
    stockLocationId: idOf(stockLocation),
    publishableKeyToken: typeof publishableKey?.token === "string" ? publishableKey.token : null,
  };
}

function productInput(salesChannelId: string, shippingProfileId: string) {
  const metadata = metadataFor(TARGET);
  return {
    title: TARGET.title,
    description: TARGET.description,
    handle: TARGET.handle,
    status: "published" as const,
    thumbnail: TARGET.imageUrl,
    images: [{ url: TARGET.imageUrl }],
    metadata,
    sales_channels: [{ id: salesChannelId }],
    shipping_profile_id: shippingProfileId,
    options: [{ title: "Variant", values: ["Default"] }],
    variants: [
      {
        title: "Default",
        sku: TARGET.supplierSku,
        manage_inventory: true,
        prices: [{ amount: TARGET.priceAmount, currency_code: "usd" }],
        options: { Variant: "Default" },
        metadata,
      },
    ],
  };
}

async function createOrRepairProduct(
  container: ExecArgs["container"],
  query: any,
  salesChannelId: string,
  shippingProfileId: string,
) {
  let product = await findProductByHandle(query);
  assertSafeToRepairExistingProduct(product);
  const input = productInput(salesChannelId, shippingProfileId);
  if (!product) {
    const created = await createProductsWorkflow(container).run({ input: { products: [input] } });
    product = asArray<Record<string, unknown>>(created.result)[0] || null;
  } else {
    const { variants: _variants, ...productUpdate } = input;
    await updateProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: String(product.id),
            ...productUpdate,
          },
        ],
      },
    });
    await linkProductsToSalesChannelWorkflow(container).run({
      input: { id: salesChannelId, add: [String(product.id)] },
    });
  }

  product = await findProductByHandle(query);
  let variant = asArray<Record<string, unknown>>(product?.variants).find((item) => item.sku === TARGET.supplierSku) ||
    asArray<Record<string, unknown>>(product?.variants)[0] ||
    null;
  const metadata = metadataFor(TARGET);
  if (variant?.id) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            id: String(variant.id),
            title: "Default",
            sku: TARGET.supplierSku,
            manage_inventory: true,
            prices: [{ amount: TARGET.priceAmount, currency_code: "usd" }],
            metadata,
          },
        ],
      },
    });
  } else if (product?.id) {
    const createdVariant = await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: [
          {
            product_id: String(product.id),
            title: "Default",
            sku: TARGET.supplierSku,
            manage_inventory: true,
            prices: [{ amount: TARGET.priceAmount, currency_code: "usd" }],
            options: { Variant: "Default" },
            metadata,
          },
        ],
      },
    });
    variant = asArray<Record<string, unknown>>(createdVariant.result)[0] || null;
  }

  product = await findProductByHandle(query);
  variant = asArray<Record<string, unknown>>(product?.variants).find((item) => item.sku === TARGET.supplierSku) ||
    asArray<Record<string, unknown>>(product?.variants)[0] ||
    variant;
  return { product, variant };
}

async function syncInventory(container: ExecArgs["container"], query: any, variantId: string | null, stockLocationId: string | null) {
  if (!variantId || !stockLocationId) return { inventoryItemId: null, inventoryLevelReady: false };
  const link = await ensureVariantInventoryLink(container, variantId);
  const inventoryItemId = link.inventoryItemId;
  if (!inventoryItemId) return { inventoryItemId: null, inventoryLevelReady: false };
  const { createInventoryLevelsWorkflow, updateInventoryLevelsWorkflow } = await import("@medusajs/medusa/core-flows");
  const levels = await graph(
    query,
    "inventory_level",
    ["id", "inventory_item_id", "location_id", "stocked_quantity"],
    { inventory_item_id: inventoryItemId, location_id: stockLocationId },
    1,
  );
  const level = levels[0] || null;
  if (level?.id) {
    await updateInventoryLevelsWorkflow(container).run({
      input: {
        updates: [
          {
            id: String(level.id),
            inventory_item_id: inventoryItemId,
            location_id: stockLocationId,
            stocked_quantity: TARGET.stockQty,
          },
        ],
      },
    });
  } else {
    await createInventoryLevelsWorkflow(container).run({
      input: {
        inventory_levels: [
          {
            inventory_item_id: inventoryItemId,
            location_id: stockLocationId,
            stocked_quantity: TARGET.stockQty,
          },
        ],
      },
    });
  }
  return { inventoryItemId, inventoryLevelReady: true };
}

function medusaBaseUrl() {
  return String(
    process.env.MEDUSA_BASE_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
      "",
  ).trim().replace(/\/+$/, "");
}

async function storeJson(path: string, token: string | null, init: RequestInit = {}) {
  const baseUrl = medusaBaseUrl();
  if (!baseUrl || !token) return { ok: false, status: 0, json: null as any };
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-publishable-api-key": token,
        ...(init.headers || {}),
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, json: text ? JSON.parse(text) : null };
  } catch {
    return { ok: false, status: 0, json: null as any };
  }
}

async function verifyStoreApi(token: string | null, regionId: string | null, variantId: string | null) {
  const byHandle = await storeJson(`/store/products?handle=${encodeURIComponent(TARGET.handle)}&limit=5`, token);
  const list = await storeJson(`/store/products?limit=20`, token);
  const productVisibleByHandle = asArray<Record<string, unknown>>(byHandle.json?.products).some((product) => product.handle === TARGET.handle);
  const productVisibleInList = asArray<Record<string, unknown>>(list.json?.products).some((product) => product.handle === TARGET.handle);
  const blockers: string[] = [];
  if (!productVisibleByHandle) pushUnique(blockers, byHandle.ok ? "product_not_visible_by_handle" : "store_products_by_handle_unreachable");
  if (!productVisibleInList) pushUnique(blockers, list.ok ? "product_not_visible_in_list" : "store_products_list_unreachable");

  let shippingOptionVisible = false;
  let shippingOptionIds: string[] = [];
  if (regionId && variantId) {
    const cart = await storeJson("/store/carts", token, {
      method: "POST",
      body: JSON.stringify({ region_id: regionId, items: [{ variant_id: variantId, quantity: 1 }] }),
    });
    const cartId = cart.json?.cart?.id || cart.json?.id || cart.json?.data?.cart?.id || cart.json?.data?.id || null;
    if (cartId) {
      await storeJson(`/store/carts/${cartId}`, token, {
        method: "POST",
        body: JSON.stringify({
          shipping_address: {
            first_name: "dBaronX",
            last_name: "Seed",
            address_1: "123 Test St",
            city: "New York",
            province: "NY",
            postal_code: "10001",
            country_code: "us",
          },
        }),
      });
      const options = await storeJson(`/store/shipping-options?cart_id=${encodeURIComponent(cartId)}`, token);
      shippingOptionIds = asArray<Record<string, unknown>>(options.json?.shipping_options).map((option) => idOf(option)).filter((id): id is string => Boolean(id));
      shippingOptionVisible = options.ok && shippingOptionIds.length > 0;
      if (!shippingOptionVisible) pushUnique(blockers, options.ok ? "shipping_option_store_visibility_missing" : "shipping_options_store_api_unreachable");
    } else {
      pushUnique(blockers, "cart_create_failed_for_shipping_visibility_check");
    }
  } else {
    pushUnique(blockers, "region_or_variant_missing_for_shipping_visibility_check");
  }

  return { blockers, productVisibleByHandle, productVisibleInList, shippingOptionVisible, shippingOptionIds };
}

export async function reseedCjFirstProductCanonical({ container }: ExecArgs) {
  if (process.env[CONFIRM_ENV] !== "true") {
    console.log(JSON.stringify({
      success: false,
      blockers: [`${CONFIRM_ENV}_required`],
      nextManualStep: `Rerun with ${CONFIRM_ENV}=true to explicitly authorize reseeding the verified CJ first product.`,
    }, null, 2));
    process.exit(1);
  }

  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];
  const context = await resolveCanonicalContext(container, query);
  for (const blocker of [...context.key.blockers, ...context.shipping.blockers, ...context.consistency.blockers]) {
    if (blocker === "first_cj_product_not_linked_to_canonical_sales_channel") continue;
    pushUnique(blockers, blocker);
  }
  if (!context.canonicalSalesChannelId) pushUnique(blockers, "canonical_sales_channel_missing");
  if (!context.regionId) pushUnique(blockers, "launch_region_missing");
  if (!context.shippingProfileId) pushUnique(blockers, "shipping_profile_missing");
  if (!context.stockLocationId) pushUnique(blockers, "stock_location_missing");

  let product: Record<string, unknown> | null = null;
  let variant: Record<string, unknown> | null = null;
  let inventoryItemId: string | null = null;
  let inventoryLevelReady = false;
  if (context.canonicalSalesChannelId && context.shippingProfileId && context.stockLocationId) {
    const repaired = await createOrRepairProduct(container, query, context.canonicalSalesChannelId, context.shippingProfileId);
    product = repaired.product;
    variant = repaired.variant;
    const inventory = await syncInventory(container, query, idOf(variant), context.stockLocationId);
    inventoryItemId = inventory.inventoryItemId;
    inventoryLevelReady = inventory.inventoryLevelReady;
    if (!product?.id) pushUnique(blockers, "product_create_or_repair_failed");
    if (!variant?.id) pushUnique(blockers, "variant_create_or_repair_failed");
    if (!inventoryLevelReady) pushUnique(blockers, "inventory_level_repair_failed");
  }

  const store = await verifyStoreApi(context.publishableKeyToken, context.regionId, idOf(variant));
  for (const blocker of store.blockers) pushUnique(blockers, blocker);

  const success = blockers.length === 0 && Boolean(product?.id && variant?.id && inventoryLevelReady && store.productVisibleByHandle && store.productVisibleInList && store.shippingOptionVisible);
  const metadata = metadataFor(TARGET);
  console.log(JSON.stringify({
    success,
    mode: TARGET.mode,
    blockers,
    productId: idOf(product),
    variantId: idOf(variant),
    handle: TARGET.handle,
    title: TARGET.title,
    supplier: TARGET.supplier,
    supplierProductId: TARGET.supplierProductId,
    supplierSku: TARGET.supplierSku,
    sourceUrlPresent: Boolean(TARGET.sourceUrl),
    imageUrlPresent: Boolean(TARGET.imageUrl),
    realSupplierProduct: metadata.realSupplierProduct,
    demo: metadata.demo,
    supplierVerificationStatus: metadata.supplierVerificationStatus,
    stockQty: TARGET.stockQty,
    priceAmount: TARGET.priceAmount,
    supplierCostAmount: TARGET.supplierCostAmount,
    supplierCostCurrency: metadata.supplierCostCurrency,
    shippingCountries: TARGET.shippingCountries,
    deliveryEstimate: TARGET.deliveryEstimate,
    canonicalSalesChannelId: context.canonicalSalesChannelId,
    regionId: context.regionId,
    stockLocationId: context.stockLocationId,
    inventoryItemId,
    inventoryLevelReady,
    productVisibleByHandle: store.productVisibleByHandle,
    productVisibleInList: store.productVisibleInList,
    shippingOptionVisible: store.shippingOptionVisible,
    shippingOptionIds: store.shippingOptionIds,
    nextManualStep: success
      ? "Run first-product:readiness and first Stripe test transaction smoke with the full publishable key before opening live checkout."
      : "Resolve blockers, rerun first-product:reseed:canonical, then rerun Store API readiness before opening checkout.",
  }, null, 2));
  if (!success) process.exit(1);
}

export default reseedCjFirstProductCanonical;
