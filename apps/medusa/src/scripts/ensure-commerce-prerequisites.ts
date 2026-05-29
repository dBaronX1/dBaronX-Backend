import { writeFileSync } from "node:fs";

import { ExecArgs } from "@medusajs/framework/types";
import {
  createRegionsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

import { getQueryFromContainer } from "./inventory-lookup";
import { ensureVariantInventoryLink } from "./ensure-variant-inventory-link";
import {
  ensureShippingReadiness,
  isRedisUnavailableOrQuotaError,
  REDIS_UNAVAILABLE_BLOCKER,
  serializeProviderLinkRepairError,
} from "./shipping-readiness";

const TARGET_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";
const TARGET_SUPPLIER = "cj";
const TARGET_SUPPLIER_PRODUCT_ID = "2408300732091605000";
const TARGET_SUPPLIER_SKU = "CJDS212420104DW";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T = unknown>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const pushUnique = (values: string[], value: string) => {
  if (!values.includes(value)) values.push(value);
};

function emitCommerceResult(result: Record<string, unknown>) {
  const json = JSON.stringify(result, null, 2);
  const outputPath = String(process.env.DBX_COMMERCE_ENSURE_OUTPUT_PATH || "").trim();
  if (outputPath) writeFileSync(outputPath, `${json}\n`, { encoding: "utf8" });
  console.log(json);
}

function metadataMatchesTarget(metadata: Record<string, unknown>) {
  return (
    String(metadata.supplier || "").toLowerCase() === TARGET_SUPPLIER &&
    String(metadata.supplierProductId || "") === TARGET_SUPPLIER_PRODUCT_ID &&
    String(metadata.supplierSku || "") === TARGET_SUPPLIER_SKU &&
    metadata.realSupplierProduct === true &&
    metadata.demo === false &&
    metadata.supplierVerificationStatus === "verified_for_checkout"
  );
}

async function runEnsureCommercePrerequisites({ container }: ExecArgs) {
  const query = getQueryFromContainer(container);

  const created: string[] = [];
  const existing: string[] = [];
  const blockers: string[] = [];

  const regionsRes = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
    pagination: { take: 50 },
  });
  let region = asArray(regionsRes.data).find(
    (r) => isRecord(r) && String(r.currency_code || "").toLowerCase() === "usd",
  );
  if (!isRecord(region) || typeof region.id !== "string") {
    const createdRegion = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "dBaronX Launch Region",
            currency_code: "usd",
            countries: ["us"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    region = asArray(createdRegion.result)[0];
    if (isRecord(region) && typeof region.id === "string")
      created.push("region");
  } else existing.push("region");

  const bootstrapRegionId =
    isRecord(region) && typeof region.id === "string" ? region.id : null;
  if (bootstrapRegionId) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: {},
        update: {
          default_region_id: bootstrapRegionId,
          supported_currencies: [{ currency_code: "usd", is_default: true }],
        },
      },
    });
  } else {
    blockers.push("region_missing");
  }

  const shippingReadiness = await ensureShippingReadiness(container, {
    repair: true,
  });
  for (const item of shippingReadiness.created) pushUnique(created, item);
  for (const item of shippingReadiness.existing) pushUnique(existing, item);
  for (const blocker of shippingReadiness.blockers)
    pushUnique(blockers, blocker);

  const stockLocationId = shippingReadiness.stockLocationId;
  const salesChannelId = shippingReadiness.salesChannelId;
  const regionId = shippingReadiness.regionId;
  const shippingProfileId = shippingReadiness.shippingProfileId;
  const shippingOptionId = shippingReadiness.shippingOptionId;
  const shippingOptionReady = shippingReadiness.shippingOptionReady;
  const serviceZoneId = shippingReadiness.serviceZoneId;
  const serviceZoneReady = shippingReadiness.serviceZoneReady;
  const fulfillmentProviderReady = shippingReadiness.fulfillmentProviderReady;
  const providerEnabledForServiceLocation =
    shippingReadiness.providerEnabledForServiceLocation;
  const storeApiVisibilityProofReady =
    shippingReadiness.storeApiVisibilityProofReady;
  const storeApiVisibilityProofReason =
    shippingReadiness.storeApiVisibilityProofReason;
  const fulfillmentSetIdsFromStockLocation =
    shippingReadiness.fulfillmentSetIdsFromStockLocation;
  const salesChannelFulfillmentSetIds =
    shippingReadiness.salesChannelFulfillmentSetIds;
  const fulfillmentSetReachableFromSalesChannel =
    shippingReadiness.fulfillmentSetReachableFromSalesChannel;
  const shippingOptionIdsVisibleToStoreContext =
    shippingReadiness.shippingOptionIdsVisibleToStoreContext;
  const targetShippingOptionId = shippingReadiness.shippingOptionId;
  const storeShippingOptionProofReady =
    shippingReadiness.storeApiVisibilityProofReady;
  const storeShippingOptionProofReason =
    shippingReadiness.storeApiVisibilityProofReason;
  const storeShippingOptionReady = Boolean(
    shippingReadiness.shippingOptionReady &&
      shippingReadiness.visibleToStoreApiExpected,
  );

  const productsRes = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "metadata",
      "variants.id",
      "variants.sku",
      "variants.metadata",
      "variants.inventory_items.inventory_item_id",
      "variants.prices.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
      "variants.inventory_quantity",
      "variants.manage_inventory",
    ],
    pagination: { take: 200 },
  });
  const products = asArray(productsRes.data);
  const targetProduct = products.find((p) => {
    if (!isRecord(p) || p.handle !== TARGET_HANDLE) return false;
    const productMetadata = isRecord(p.metadata) ? p.metadata : {};
    const variantsForProduct = asArray(p.variants);
    return (
      metadataMatchesTarget(productMetadata) ||
      variantsForProduct.some((v) =>
        isRecord(v) && metadataMatchesTarget(isRecord(v.metadata) ? v.metadata : {}),
      )
    );
  });
  const variants = isRecord(targetProduct) ? asArray(targetProduct.variants) : [];
  const targetVariant = variants.find((v) => isRecord(v) && v.sku === TARGET_SUPPLIER_SKU) || variants.find((v) => isRecord(v));
  const productCount = isRecord(targetProduct) ? 1 : 0;
  const variantCount = isRecord(targetVariant) ? 1 : 0;

  const priceReady = isRecord(targetVariant) &&
    asArray(targetVariant.prices).some(
      (price) =>
        isRecord(price) &&
        Number(price.amount || 0) > 0 &&
        String(price.currency_code || "").toLowerCase() === "usd",
    );
  const supplierMetadataReady = Boolean(
    isRecord(targetProduct) &&
      (metadataMatchesTarget(isRecord(targetProduct.metadata) ? targetProduct.metadata : {}) ||
        (isRecord(targetVariant) &&
          metadataMatchesTarget(isRecord(targetVariant.metadata) ? targetVariant.metadata : {}))),
  );

  let variantId: string | null = isRecord(targetVariant) && typeof targetVariant.id === "string" ? targetVariant.id : null;
  let inventoryItemId: string | null = null;
  if (variantId) {
    const variantLink = await ensureVariantInventoryLink(container, variantId);
    variantId = variantLink.variantId;
    inventoryItemId = variantLink.inventoryItemId;
    for (const item of variantLink.created) pushUnique(created, item);
    for (const item of variantLink.existing) pushUnique(existing, item);
    for (const blocker of variantLink.blockers) pushUnique(blockers, blocker);
  }

  let inventoryLevelReady = false;
  let stockReady = false;
  if (inventoryItemId) {
    const stockLevelRes = await query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
      filters: {
        inventory_item_id: inventoryItemId,
        ...(stockLocationId ? { location_id: stockLocationId } : {}),
      },
      pagination: { take: 1 },
    });
    const stockLevel = asArray(stockLevelRes.data)[0];
    if (isRecord(stockLevel) && typeof stockLevel.id === "string") {
      inventoryLevelReady = true;
      const stockedQuantity = Number(stockLevel.stocked_quantity ?? 0);
      stockReady = stockedQuantity > 0;
      pushUnique(existing, "inventory_level");
    }
  }
  if (!stockReady && isRecord(targetVariant)) {
    const quantity = Number(targetVariant.inventory_quantity ?? 0);
    const managed = Boolean(targetVariant.manage_inventory);
    if (!managed || quantity > 0) stockReady = true;
  }

  if (productCount === 0) pushUnique(blockers, "first_cj_product_not_seeded");
  if (variantCount === 0) pushUnique(blockers, "variants_missing");
  if (!priceReady) pushUnique(blockers, "price_pending");
  if (!stockReady) pushUnique(blockers, "out_of_stock");
  if (!supplierMetadataReady) pushUnique(blockers, "supplier_na");

  const salesChannelStockLocationLinked =
    shippingReadiness.salesChannelStockLocationLinked;
  if (salesChannelStockLocationLinked) {
    pushUnique(existing, "sales_channel_stock_location_link");
  }

  if (!salesChannelStockLocationLinked)
    pushUnique(blockers, "sales_channel_stock_location_link_missing");
  if (variantCount > 0 && !inventoryLevelReady) pushUnique(blockers, "inventory_level_missing");

  emitCommerceResult(
      {
        success: blockers.length === 0,
        infrastructureReady: Boolean(regionId && salesChannelId && stockLocationId && shippingProfileId && shippingOptionReady && storeShippingOptionReady && salesChannelStockLocationLinked),
        productReady: Boolean(productCount > 0 && variantCount > 0 && priceReady && stockReady && supplierMetadataReady && inventoryLevelReady),
        checkoutReady: Boolean(regionId && salesChannelId && stockLocationId && shippingOptionReady && storeShippingOptionReady && productCount > 0 && variantCount > 0 && priceReady && stockReady && inventoryLevelReady),
        created,
        existing,
        blockers,
        salesChannelId,
        stockLocationId,
        fulfillmentSetIdsFromStockLocation,
        salesChannelFulfillmentSetIds,
        salesChannelStockLocationLinked,
        fulfillmentSetReachableFromSalesChannel,
        variantId,
        inventoryItemId,
        inventoryLevelReady,
        regionId,
        shippingProfileId,
        shippingOptionId,
        shippingOptionReady,
        storeShippingOptionReady,
        storeShippingOptionProofReady,
        storeShippingOptionProofReason,
        shippingOptionIdsVisibleToStoreContext,
        targetShippingOptionId,
        shippingPriceReady: shippingReadiness.priceReady,
        shippingRulesReady: shippingReadiness.rulesReady,
        shippingVisibleToStoreApiExpected:
          shippingReadiness.visibleToStoreApiExpected,
        storeApiVisibilityProofReady,
        storeApiVisibilityProofReason,
        serviceZoneId,
        serviceZoneReady,
        fulfillmentProviderReady,
        providerEnabledForServiceLocation,
        productCount,
        variantCount,
        priceReady,
        stockReady,
        supplierMetadataReady,
      },
  );
}

export default async function ensureCommercePrerequisites(args: ExecArgs) {
  try {
    await runEnsureCommercePrerequisites(args);
  } catch (error) {
    const blockers = isRedisUnavailableOrQuotaError(error)
      ? [REDIS_UNAVAILABLE_BLOCKER]
      : [
          `commerce_ensure_failed:${String(
            serializeProviderLinkRepairError(error).message,
          )}`,
        ];

    emitCommerceResult(
        {
          success: false,
          created: [],
          existing: [],
          blockers,
          error: serializeProviderLinkRepairError(error),
          note: "If Medusa boot fails before this script runs, Redis must be fixed at the environment/infrastructure level.",
        },
    );
  }
}
