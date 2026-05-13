import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { linkProductsToSalesChannelWorkflow, updateStoresWorkflow } from "@medusajs/medusa/core-flows";

import { ensurePublishableApiKey, KEY_TITLE } from "./ensure-publishable-api-key";
import {
  DEFAULT_SALES_CHANNEL_NAME,
  DEFAULT_STOCK_LOCATION_NAME,
  ensureShippingReadiness,
} from "./shipping-readiness";

const FIRST_CJ_HANDLE = "mens-cotton-linen-long-sleeve-casual-shirt";

type QueryGraphResult = Record<string, unknown> | unknown[] | null | undefined;

const asArray = <T = Record<string, unknown>>(
  value: unknown,
  fallbackKeys: string[] = [],
): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["data", ...fallbackKeys]) {
    const nested = record[key];
    if (Array.isArray(nested)) return nested as T[];
  }
  return [];
};

const idOf = (value: unknown): string | null =>
  value && typeof value === "object" && typeof (value as any).id === "string"
    ? (value as any).id
    : null;

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

async function graph(query: any, entity: string, fields: string[], filters?: Record<string, unknown>, take = 100) {
  const result: QueryGraphResult = await query.graph({
    entity,
    fields,
    ...(filters ? { filters } : {}),
    pagination: { take },
  });
  return asArray<Record<string, unknown>>(result, [entity, `${entity}s`]);
}

async function resolveCanonicalSalesChannel(query: any, fallbackId?: string | null) {
  const channels = await graph(query, "sales_channel", ["id", "name", "is_default"], undefined, 100);
  return (
    channels.find((channel) => channel.name === DEFAULT_SALES_CHANNEL_NAME) ||
    channels.find((channel) => idOf(channel) === fallbackId) ||
    channels.find((channel) => channel.is_default === true) ||
    channels[0] ||
    null
  );
}

async function readStoreDefaultSalesChannelId(_query: any) {
  return null;
}

async function ensureProductSalesChannel(query: any, container: ExecArgs["container"], salesChannelId: string | null) {
  if (!salesChannelId) return { productLinked: false, productSalesChannelIds: [] as string[], repaired: false };
  const products = await graph(
    query,
    "product",
    ["id", "handle", "sales_channels.id", "variants.id"],
    { handle: FIRST_CJ_HANDLE },
    1,
  );
  const product = products[0] || null;
  if (!product?.id) return { productLinked: false, productSalesChannelIds: [] as string[], repaired: false };
  const currentIds = asArray<Record<string, unknown>>(product.sales_channels).map(idOf).filter((id): id is string => Boolean(id));
  if (currentIds.includes(salesChannelId)) {
    return { productLinked: true, productSalesChannelIds: currentIds, repaired: false };
  }
  await linkProductsToSalesChannelWorkflow(container).run({
    input: { id: salesChannelId, add: [String(product.id)] },
  });
  return {
    productLinked: true,
    productSalesChannelIds: unique([...currentIds, salesChannelId]),
    repaired: true,
  };
}

async function readPublishableKeyLinks(query: any, canonicalSalesChannelId: string | null) {
  const keys = await graph(query, "api_key", ["id", "title", "type", "sales_channels.id"], { type: "publishable" }, 100);
  const key =
    keys.find((candidate) => candidate.title === KEY_TITLE) ||
    keys.find((candidate) =>
      asArray<Record<string, unknown>>(candidate.sales_channels).some((channel) => idOf(channel) === canonicalSalesChannelId),
    ) ||
    keys[0] ||
    null;
  const publishableKeySalesChannelIds = asArray<Record<string, unknown>>(key?.sales_channels)
    .map(idOf)
    .filter((id): id is string => Boolean(id));
  return {
    publishableApiKeyId: idOf(key),
    publishableKeySalesChannelIds,
    publishableKeyLinked: Boolean(canonicalSalesChannelId && publishableKeySalesChannelIds.includes(canonicalSalesChannelId)),
    stalePublishableKeyLinksDetected: publishableKeySalesChannelIds.filter((id) => id !== canonicalSalesChannelId),
  };
}

async function readStockLocationLinks(query: any, canonicalSalesChannelId: string | null) {
  const stockLocations = await graph(query, "stock_location", ["id", "name", "sales_channels.id"], undefined, 100);
  const location =
    stockLocations.find((item) => item.name === DEFAULT_STOCK_LOCATION_NAME) ||
    stockLocations.find((item) => /dBaronX/i.test(String(item.name || ""))) ||
    stockLocations[0] ||
    null;
  const ids = asArray<Record<string, unknown>>(location?.sales_channels)
    .map(idOf)
    .filter((id): id is string => Boolean(id));
  return {
    stockLocationId: idOf(location),
    stockLocationSalesChannelIds: ids,
    stockLocationLinked: Boolean(canonicalSalesChannelId && ids.includes(canonicalSalesChannelId)),
  };
}

export async function ensureLaunchSalesChannelConsistency(container: ExecArgs["container"]) {
  const query = container.resolve<any>(ContainerRegistrationKeys.QUERY);
  const repaired: string[] = [];
  const blockers: string[] = [];

  const shipping = await ensureShippingReadiness(container, { repair: true });
  const key = await ensurePublishableApiKey(container);
  const canonical = await resolveCanonicalSalesChannel(query, shipping.salesChannelId || key.salesChannelId);
  const canonicalSalesChannelId = idOf(canonical);

  if (!canonicalSalesChannelId) blockers.push("canonical_sales_channel_missing");
  if (shipping.regionId) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: {},
        update: {
          default_region_id: shipping.regionId,
          supported_currencies: [{ currency_code: "usd", is_default: true }],
        },
      },
    });
    repaired.push("store_region_and_usd_currency_asserted");
  }

  const publishableLinks = await readPublishableKeyLinks(query, canonicalSalesChannelId);
  const product = await ensureProductSalesChannel(query, container, canonicalSalesChannelId);
  if (product.repaired) repaired.push("first_cj_product_sales_channel_link");
  const stockLocation = await readStockLocationLinks(query, canonicalSalesChannelId);
  const storeDefaultSalesChannelId = await readStoreDefaultSalesChannelId(query);
  const salesChannels = await graph(query, "sales_channel", ["id", "name", "is_default"], undefined, 100);
  const staleSalesChannelsDetected = salesChannels
    .filter((channel) => idOf(channel) !== canonicalSalesChannelId && (channel.name === DEFAULT_SALES_CHANNEL_NAME || channel.is_default === true))
    .map((channel) => idOf(channel))
    .filter((id): id is string => Boolean(id));

  if (!publishableLinks.publishableKeyLinked) blockers.push("publishable_key_not_linked_to_canonical_sales_channel");
  if (!product.productLinked) blockers.push("first_cj_product_not_linked_to_canonical_sales_channel");
  if (!stockLocation.stockLocationLinked) blockers.push("stock_location_not_linked_to_canonical_sales_channel");
  if (!shipping.storeApiVisibilityProofReady) blockers.push("shipping_option_not_visible_for_canonical_store_context");

  return {
    success: blockers.length === 0,
    blockers: unique([...shipping.blockers, ...key.blockers, ...blockers]),
    canonicalSalesChannelId,
    publishableApiKeyId: publishableLinks.publishableApiKeyId || key.publishableApiKeyId,
    publishableKeyLinked: publishableLinks.publishableKeyLinked || key.linked,
    publishableKeySalesChannelIds: publishableLinks.publishableKeySalesChannelIds,
    storeDefaultSalesChannelId,
    productLinked: product.productLinked,
    productSalesChannelIds: product.productSalesChannelIds,
    stockLocationLinked: stockLocation.stockLocationLinked || shipping.salesChannelStockLocationLinked,
    stockLocationId: stockLocation.stockLocationId || shipping.stockLocationId,
    stockLocationSalesChannelIds: stockLocation.stockLocationSalesChannelIds,
    shippingOptionVisibleForCanonicalCart: shipping.storeApiVisibilityProofReady,
    shippingOptionIdsVisibleToStoreContext: shipping.shippingOptionIdsVisibleToStoreContext,
    staleSalesChannelsDetected,
    stalePublishableKeyLinksDetected: publishableLinks.stalePublishableKeyLinksDetected,
    repaired: unique([...repaired, ...shipping.created, ...key.created]),
    nextManualStep:
      blockers.length === 0
        ? "Run first-product:seed:cj-shirt once if needed, then run first-product and first-stripe transaction smokes with the full publishable key."
        : "Resolve listed blockers, rerun launch-sales-channel:ensure, and do not open checkout until Store API product and shipping visibility are green.",
  };
}

export default async function ensureLaunchSalesChannelConsistencyCommand({ container }: ExecArgs) {
  console.log(JSON.stringify(await ensureLaunchSalesChannelConsistency(container), null, 2));
}
