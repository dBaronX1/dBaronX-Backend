import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

import {
  DEFAULT_COUNTRY_CODE,
  DEFAULT_SHIPPING_OPTION_NAME,
  TARGET_REGION_ID,
  TARGET_SALES_CHANNEL_ID,
  TARGET_SERVICE_ZONE_ID,
  TARGET_STOCK_LOCATION_ID,
} from "./shipping-readiness";

type StoreShippingOptionsProof = {
  success: boolean;
  blockers: string[];
  regionId: string | null;
  salesChannelId: string | null;
  stockLocationId: string | null;
  fulfillmentSetIdsFromStockLocation: string[];
  salesChannelFulfillmentSetIds: string[];
  fulfillmentSetReachableFromSalesChannel: boolean;
  serviceZoneId: string | null;
  shippingOptionId: string | null;
  enabledInStore: boolean;
  priceReady: boolean;
  usServiceZoneReady: boolean;
  salesChannelStockLocationLinked: boolean;
  storeApiVisibilityExpected: boolean;
  proofReason: string;
  duplicateShippingOptionIds?: string[];
  shippingOptionIdsVisibleToStoreContext?: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T = unknown>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const getId = (value: unknown): string | null =>
  isRecord(value) && typeof value.id === "string" ? value.id : null;

const pushUnique = (values: string[], value: string) => {
  if (value && !values.includes(value)) values.push(value);
};

async function safeGraph(
  query: any,
  entity: string,
  fields: string[],
  filters?: Record<string, unknown>,
  take = 50,
): Promise<Record<string, unknown>[]> {
  try {
    const result = await query.graph({
      entity,
      fields,
      filters,
      pagination: { take },
    });
    return asArray<Record<string, unknown>>(result?.data).filter(isRecord);
  } catch {
    return [];
  }
}

const hasUsGeoZone = (serviceZone: unknown): boolean =>
  asArray<Record<string, unknown>>(
    isRecord(serviceZone) ? serviceZone.geo_zones : undefined,
  ).some(
    (geoZone) =>
      isRecord(geoZone) &&
      String(geoZone.type || "").toLowerCase() === "country" &&
      String(geoZone.country_code || "").toLowerCase() ===
        DEFAULT_COUNTRY_CODE,
  );

const ruleValue = (shippingOption: unknown, attribute: string): string | null =>
  String(
    asArray<Record<string, unknown>>(
      isRecord(shippingOption) ? shippingOption.rules : undefined,
    ).find((rule) => String(rule.attribute || "") === attribute)?.value || "",
  ) || null;

const optionEnabledInStore = (shippingOption: unknown): boolean =>
  ruleValue(shippingOption, "enabled_in_store") === "true";

const optionIsNonReturn = (shippingOption: unknown): boolean =>
  ruleValue(shippingOption, "is_return") === "false";

const priceReadyForUsdOrRegion = (shippingOption: unknown): boolean =>
  asArray<Record<string, unknown>>(
    isRecord(shippingOption) ? shippingOption.prices : undefined,
  ).some((price) => {
    const currencyReady = String(price.currency_code || "").toLowerCase() === "usd";
    const amountReady = Number.isFinite(Number(price.amount)) && Number(price.amount) >= 0;
    const priceRules = asArray<Record<string, unknown>>(price.price_rules);
    const regionRuleReady =
      priceRules.length === 0 ||
      priceRules.some(
        (rule) =>
          String(rule.attribute || "") === "region_id" &&
          String(rule.value || "") === TARGET_REGION_ID,
      );
    return currencyReady && amountReady && regionRuleReady;
  });

function scoreShippingOption(option: Record<string, unknown>): number {
  return [
    optionEnabledInStore(option),
    optionIsNonReturn(option),
    priceReadyForUsdOrRegion(option),
    String(option.price_type || "") === "flat",
  ].filter(Boolean).length;
}

async function visibleStoreContextOptionIds(
  container: any,
  fulfillmentSetIds: string[],
): Promise<string[]> {
  if (fulfillmentSetIds.length === 0) return [];
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
  const options = await fulfillmentModule.listShippingOptionsForContext({
    context: {
      is_return: "false",
      enabled_in_store: "true",
    },
    fulfillment_set_id: fulfillmentSetIds,
    address: {
      country_code: DEFAULT_COUNTRY_CODE,
      province_code: "NY",
      city: "New York",
      postal_expression: "10001",
    },
  });
  return asArray<Record<string, unknown>>(options)
    .map(getId)
    .filter((id): id is string => Boolean(id));
}

export default async function verifyStoreShippingOptions({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const blockers: string[] = [];

  const region = (
    await safeGraph(
      query,
      "region",
      ["id", "currency_code", "countries.iso_2"],
      { id: TARGET_REGION_ID },
      1,
    )
  )[0];
  const regionId = getId(region);
  const regionCountryReady = asArray<Record<string, unknown>>(region?.countries).some(
    (country) => String(country.iso_2 || "").toLowerCase() === DEFAULT_COUNTRY_CODE,
  );
  if (!regionId) pushUnique(blockers, "region_missing");
  if (regionId && String(region.currency_code || "").toLowerCase() !== "usd") {
    pushUnique(blockers, "target_region_not_usd");
  }
  if (regionId && !regionCountryReady) pushUnique(blockers, "target_region_us_missing");

  const salesChannel = (
    await safeGraph(
      query,
      "sales_channels",
      [
        "id",
        "name",
        "stock_locations.id",
        "stock_locations.fulfillment_sets.id",
      ],
      { id: TARGET_SALES_CHANNEL_ID },
      1,
    )
  )[0];
  const salesChannelId = getId(salesChannel);
  if (!salesChannelId) pushUnique(blockers, "sales_channel_missing");

  const stockLocation = (
    await safeGraph(
      query,
      "stock_location",
      [
        "id",
        "name",
        "fulfillment_sets.id",
        "fulfillment_sets.service_zones.id",
        "fulfillment_sets.service_zones.name",
        "fulfillment_sets.service_zones.geo_zones.type",
        "fulfillment_sets.service_zones.geo_zones.country_code",
      ],
      { id: TARGET_STOCK_LOCATION_ID },
      1,
    )
  )[0];
  const stockLocationId = getId(stockLocation);
  if (!stockLocationId) pushUnique(blockers, "stock_location_missing");

  const salesChannelStockLocations = asArray<Record<string, unknown>>(
    salesChannel?.stock_locations,
  ).filter(isRecord);
  const salesChannelStockLocationLinked = salesChannelStockLocations.some(
    (location) => getId(location) === stockLocationId,
  );
  if (!salesChannelStockLocationLinked) {
    pushUnique(blockers, "sales_channel_stock_location_link_missing");
  }

  const fulfillmentSetIdsFromStockLocation = Array.from(
    new Set(
      asArray<Record<string, unknown>>(stockLocation?.fulfillment_sets)
        .map(getId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (fulfillmentSetIdsFromStockLocation.length === 0)
    pushUnique(blockers, "stock_location_fulfillment_sets_missing");

  const salesChannelFulfillmentSetIds = Array.from(
    new Set(
      salesChannelStockLocations
        .flatMap((location) =>
          asArray<Record<string, unknown>>(location.fulfillment_sets),
        )
        .map(getId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  if (
    salesChannelStockLocationLinked &&
    salesChannelFulfillmentSetIds.length === 0
  ) {
    pushUnique(
      blockers,
      "sales_channel_fulfillment_sets_missing_for_store_api_filter",
    );
  }
  const fulfillmentSetReachableFromSalesChannel =
    fulfillmentSetIdsFromStockLocation.some((id) =>
      salesChannelFulfillmentSetIds.includes(id),
    );
  if (!fulfillmentSetReachableFromSalesChannel) {
    pushUnique(blockers, "fulfillment_set_not_reachable_from_sales_channel");
  }

  const serviceZones = asArray<Record<string, unknown>>(
    stockLocation?.fulfillment_sets,
  )
    .flatMap((fulfillmentSet) =>
      asArray<Record<string, unknown>>(fulfillmentSet.service_zones),
    )
    .filter(isRecord);
  const serviceZone =
    serviceZones.find((zone) => getId(zone) === TARGET_SERVICE_ZONE_ID) ||
    serviceZones.find(hasUsGeoZone) ||
    serviceZones[0];
  const serviceZoneId = getId(serviceZone);
  const usServiceZoneReady = Boolean(serviceZoneId && hasUsGeoZone(serviceZone));
  if (!serviceZoneId) pushUnique(blockers, "service_zone_missing");
  if (serviceZoneId && !usServiceZoneReady)
    pushUnique(blockers, "service_zone_us_missing");

  const shippingOptions = (
    await safeGraph(
      query,
      "shipping_option",
      [
        "id",
        "name",
        "price_type",
        "service_zone_id",
        "service_zone.id",
        "service_zone.fulfillment_set_id",
        "rules.id",
        "rules.attribute",
        "rules.operator",
        "rules.value",
        "prices.id",
        "prices.amount",
        "prices.currency_code",
        "prices.price_rules.id",
        "prices.price_rules.attribute",
        "prices.price_rules.value",
      ],
      undefined,
      100,
    )
  ).filter((option) => {
    const optionServiceZoneId =
      typeof option.service_zone_id === "string"
        ? option.service_zone_id
        : getId(option.service_zone);
    return (
      option.name === DEFAULT_SHIPPING_OPTION_NAME &&
      optionServiceZoneId === serviceZoneId
    );
  });
  const shippingOption = [...shippingOptions].sort(
    (left, right) => scoreShippingOption(right) - scoreShippingOption(left),
  )[0];
  const shippingOptionId = getId(shippingOption);
  const duplicateShippingOptionIds = shippingOptions
    .map(getId)
    .filter((id): id is string => Boolean(id && id !== shippingOptionId));
  if (!shippingOptionId) pushUnique(blockers, "shipping_option_missing");
  if (duplicateShippingOptionIds.length > 0)
    pushUnique(blockers, "duplicate_shipping_options_present");

  const enabledInStore = optionEnabledInStore(shippingOption);
  const nonReturnReady = optionIsNonReturn(shippingOption);
  const priceReady = priceReadyForUsdOrRegion(shippingOption);
  if (shippingOptionId && !enabledInStore)
    pushUnique(blockers, "shipping_option_enabled_in_store_missing");
  if (shippingOptionId && !nonReturnReady)
    pushUnique(blockers, "shipping_option_non_return_rule_missing");
  if (shippingOptionId && !priceReady)
    pushUnique(blockers, "shipping_option_usd_region_price_missing");

  let shippingOptionIdsVisibleToStoreContext: string[] = [];
  try {
    shippingOptionIdsVisibleToStoreContext = await visibleStoreContextOptionIds(
      container,
      salesChannelFulfillmentSetIds,
    );
  } catch (error) {
    pushUnique(
      blockers,
      `store_context_probe_failed:${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const storeApiVisibilityExpected = Boolean(
    shippingOptionId &&
      enabledInStore &&
      nonReturnReady &&
      priceReady &&
      usServiceZoneReady &&
      salesChannelStockLocationLinked &&
      fulfillmentSetReachableFromSalesChannel &&
      shippingOptionIdsVisibleToStoreContext.includes(shippingOptionId),
  );
  if (
    shippingOptionId &&
    !shippingOptionIdsVisibleToStoreContext.includes(shippingOptionId)
  ) {
    pushUnique(blockers, "shipping_option_store_visibility_missing");
  }

  const proofReason = storeApiVisibilityExpected
    ? `target shipping option ${shippingOptionId} is enabled_in_store=true, is_return=false, priced for USD/region, inside US service zone ${serviceZoneId}, and visible through sales channel ${salesChannelId} fulfillment sets ${salesChannelFulfillmentSetIds.join(",")}`
    : `store visibility not proven; blockers=${blockers.join(",") || "unknown"}; visibleStoreContextIds=${shippingOptionIdsVisibleToStoreContext.join(",") || "none"}`;

  const proof: StoreShippingOptionsProof = {
    success: blockers.length === 0,
    blockers,
    regionId,
    salesChannelId,
    stockLocationId,
    fulfillmentSetIdsFromStockLocation,
    salesChannelFulfillmentSetIds,
    fulfillmentSetReachableFromSalesChannel,
    serviceZoneId,
    shippingOptionId,
    enabledInStore,
    priceReady,
    usServiceZoneReady,
    salesChannelStockLocationLinked,
    storeApiVisibilityExpected,
    proofReason,
    duplicateShippingOptionIds,
    shippingOptionIdsVisibleToStoreContext,
  };

  console.log(JSON.stringify(proof, null, 2));
}
