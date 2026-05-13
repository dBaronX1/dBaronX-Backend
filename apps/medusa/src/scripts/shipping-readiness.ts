import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  createLocationFulfillmentSetWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateServiceZonesWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

export const TARGET_REGION_ID = process.env.MEDUSA_REGION_ID || "";
export const TARGET_SHIPPING_PROFILE_ID = process.env.MEDUSA_SHIPPING_PROFILE_ID || "";
export const TARGET_STOCK_LOCATION_ID = process.env.MEDUSA_STOCK_LOCATION_ID || "";
export const TARGET_SALES_CHANNEL_ID = process.env.MEDUSA_SALES_CHANNEL_ID || "";
export const TARGET_SERVICE_ZONE_ID = process.env.MEDUSA_SERVICE_ZONE_ID || "";
export const PREFERRED_MANUAL_FULFILLMENT_PROVIDER_ID = "manual_manual";

export const DEFAULT_REGION_NAME = "dBaronX United States Region";
export const DEFAULT_SALES_CHANNEL_NAME = "dBaronX Default Sales Channel";
export const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile";
export const DEFAULT_STOCK_LOCATION_NAME = "dBaronX Default Stock Location";
export const DEFAULT_SHIPPING_OPTION_NAME = "dBaronX Standard Delivery";
export const DEFAULT_SERVICE_ZONE_NAME = "dBaronX United States Delivery Zone";
export const DEFAULT_FULFILLMENT_SET_NAME = "dBaronX Shipping";
export const DEFAULT_COUNTRY_CODE = "us";

type EnsureShippingReadinessOptions = {
  repair?: boolean;
};

export type EnsureShippingReadinessResult = {
  created: string[];
  existing: string[];
  blockers: string[];
  regionId: string | null;
  salesChannelId: string | null;
  shippingProfileId: string | null;
  stockLocationId: string | null;
  shippingOptionId: string | null;
  fulfillmentProviderReady: boolean;
  fulfillmentProviderId: string | null;
  selectedFulfillmentProviderId: string | null;
  selectedFulfillmentProviderSource: string | null;
  allFulfillmentProviderIds: string[];
  allFulfillmentProviderRecords: Record<string, unknown>[];
  fulfillmentSetReady: boolean;
  fulfillmentSetId: string | null;
  serviceZoneReady: boolean;
  serviceZoneId: string | null;
  shippingOptionReady: boolean;
  priceReady: boolean;
  rulesReady: boolean;
  visibleToStoreApiExpected: boolean;
  storeApiVisibilityProofReady: boolean;
  storeApiVisibilityProofReason: string | null;
  salesChannelStockLocationLinked: boolean;
  fulfillmentSetIdsFromStockLocation: string[];
  salesChannelFulfillmentSetIds: string[];
  fulfillmentSetReachableFromSalesChannel: boolean;
  providerEnabledForServiceLocation: boolean;
  stockLocationProviderIds: string[];
  serviceZoneProviderIds: string[];
  attemptedProviderLink: boolean;
  providerLinkCreated: boolean;
  providerLinkVerifiedAfterRefetch: boolean;
  providerLinkRepairError?: Record<string, unknown>;
  providerLinkWorkflowUsed: string | null;
  providerLinkInputPreview: Record<string, unknown> | null;
  createShippingOptionsWorkflowInput: Record<string, unknown>[] | null;
  shippingOptionIdsVisibleToStoreContext: string[];
  duplicateShippingOptionIds: string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asArray = <T = unknown>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

const pushUnique = (values: string[], value: string) => {
  if (!values.includes(value)) values.push(value);
};

const getId = (value: unknown): string | null =>
  isRecord(value) && typeof value.id === "string" ? value.id : null;

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

const hasCountryGeoZone = (serviceZone: unknown) =>
  asArray(isRecord(serviceZone) ? serviceZone.geo_zones : undefined).some(
    (geoZone) =>
      isRecord(geoZone) &&
      String(geoZone.type || "").toLowerCase() === "country" &&
      String(geoZone.country_code || "").toLowerCase() === DEFAULT_COUNTRY_CODE,
  );

const findUsServiceZone = (
  fulfillmentSet: unknown,
): Record<string, unknown> | undefined => {
  const serviceZones = asArray<Record<string, unknown>>(
    isRecord(fulfillmentSet) ? fulfillmentSet.service_zones : undefined,
  ).filter(isRecord);
  return (
    serviceZones.find((zone) => getId(zone) === TARGET_SERVICE_ZONE_ID) ||
    serviceZones.find(hasCountryGeoZone) ||
    serviceZones.find((zone) => getId(zone))
  );
};

async function findStockLocationFulfillmentSet(
  query: any,
  stockLocationId: string,
) {
  const stockLocations = await safeGraph(
    query,
    "stock_location",
    [
      "id",
      "name",
      "fulfillment_sets.id",
      "fulfillment_sets.name",
      "fulfillment_sets.type",
      "fulfillment_sets.service_zones.id",
      "fulfillment_sets.service_zones.name",
      "fulfillment_sets.service_zones.geo_zones.id",
      "fulfillment_sets.service_zones.geo_zones.type",
      "fulfillment_sets.service_zones.geo_zones.country_code",
      "fulfillment_providers.id",
    ],
    { id: stockLocationId },
    1,
  );
  const stockLocation = stockLocations[0];
  const fulfillmentSetFromLocation = asArray<Record<string, unknown>>(
    stockLocation?.fulfillment_sets,
  ).find((set) => getId(set));
  if (fulfillmentSetFromLocation) return fulfillmentSetFromLocation;

  const fulfillmentSets = await safeGraph(
    query,
    "fulfillment_set",
    [
      "id",
      "name",
      "type",
      "stock_locations.id",
      "service_zones.id",
      "service_zones.name",
      "service_zones.geo_zones.id",
      "service_zones.geo_zones.type",
      "service_zones.geo_zones.country_code",
      "locations.id",
      "locations.fulfillment_providers.id",
    ],
    undefined,
    100,
  );

  return fulfillmentSets.find((set) =>
    asArray<Record<string, unknown>>(set.stock_locations).some(
      (location) => getId(location) === stockLocationId,
    ),
  );
}

async function findFulfillmentProviders(
  query: any,
): Promise<Record<string, unknown>[]> {
  return safeGraph(
    query,
    "fulfillment_provider",
    ["id", "is_enabled"],
    undefined,
    100,
  );
}

type FulfillmentProviderSelection = {
  selectedFulfillmentProviderId: string | null;
  selectedFulfillmentProviderSource: string | null;
};

const isProviderEnabled = (provider: Record<string, unknown>): boolean =>
  provider.is_enabled !== false;

function selectFulfillmentProviderId(
  providers: Record<string, unknown>[],
  stockLocationProviderIds: string[],
  serviceZoneProviderIds: string[],
): FulfillmentProviderSelection {
  const enabledProviders = providers.filter(
    (provider) => getId(provider) && isProviderEnabled(provider),
  );
  const preferredProvider = enabledProviders.find(
    (provider) => getId(provider) === PREFERRED_MANUAL_FULFILLMENT_PROVIDER_ID,
  );
  if (preferredProvider) {
    return {
      selectedFulfillmentProviderId: getId(preferredProvider),
      selectedFulfillmentProviderSource: "preferred_manual_manual",
    };
  }

  const manualProvider = enabledProviders.find((provider) =>
    String(getId(provider) || "")
      .toLowerCase()
      .includes("manual"),
  );
  if (manualProvider) {
    return {
      selectedFulfillmentProviderId: getId(manualProvider),
      selectedFulfillmentProviderSource: "enabled_manual_provider",
    };
  }

  const linkedProviderIds = [
    ...serviceZoneProviderIds.filter((id) =>
      stockLocationProviderIds.includes(id),
    ),
    ...stockLocationProviderIds,
    ...serviceZoneProviderIds,
  ];
  const linkedProvider = linkedProviderIds
    .map((providerId) =>
      enabledProviders.find((provider) => getId(provider) === providerId),
    )
    .find((provider): provider is Record<string, unknown> => Boolean(provider));
  if (linkedProvider) {
    return {
      selectedFulfillmentProviderId: getId(linkedProvider),
      selectedFulfillmentProviderSource: "existing_enabled_linked_provider",
    };
  }

  return {
    selectedFulfillmentProviderId: null,
    selectedFulfillmentProviderSource:
      "fulfillment_provider_missing_or_disabled",
  };
}

async function readSalesChannelStoreApiContext(
  query: any,
  stockLocationId: string | null,
  salesChannelId: string | null,
): Promise<{
  salesChannelId: string | null;
  salesChannelStockLocationLinked: boolean;
  salesChannelFulfillmentSetIds: string[];
}> {
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
      salesChannelId ? { id: salesChannelId } : undefined,
      50,
    )
  ).find((channel) => !salesChannelId || getId(channel) === salesChannelId);
  const resolvedSalesChannelId = getId(salesChannel);
  const stockLocations = asArray<Record<string, unknown>>(
    salesChannel?.stock_locations,
  ).filter(isRecord);
  const salesChannelStockLocationLinked = Boolean(
    stockLocationId &&
      stockLocations.some((location) => getId(location) === stockLocationId),
  );
  const salesChannelFulfillmentSetIds = Array.from(
    new Set(
      stockLocations
        .flatMap((location) =>
          asArray<Record<string, unknown>>(location.fulfillment_sets),
        )
        .map(getId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  return {
    salesChannelId: resolvedSalesChannelId,
    salesChannelStockLocationLinked,
    salesChannelFulfillmentSetIds,
  };
}

async function ensureSalesChannelStockLocationLink(
  container: any,
  query: any,
  stockLocationId: string | null,
  salesChannelId: string | null,
  repair: boolean,
  created: string[],
  existing: string[],
  blockers: string[],
): Promise<{
  salesChannelStockLocationLinked: boolean;
  salesChannelFulfillmentSetIds: string[];
}> {
  if (!stockLocationId) {
    return {
      salesChannelStockLocationLinked: false,
      salesChannelFulfillmentSetIds: [],
    };
  }

  let storeApiContext = await readSalesChannelStoreApiContext(
    query,
    stockLocationId,
    salesChannelId,
  );
  if (!storeApiContext.salesChannelId) {
    pushUnique(blockers, "sales_channel_missing");
    return {
      salesChannelStockLocationLinked: false,
      salesChannelFulfillmentSetIds: [],
    };
  }

  if (!storeApiContext.salesChannelStockLocationLinked && repair) {
    try {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: stockLocationId, add: [storeApiContext.salesChannelId] },
      });
      pushUnique(created, "sales_channel_stock_location_link");
      storeApiContext = await readSalesChannelStoreApiContext(
        query,
        stockLocationId,
        storeApiContext.salesChannelId,
      );
    } catch (error) {
      addWorkflowErrorBlocker(
        blockers,
        "sales_channel_stock_location_link",
        error,
      );
    }
  }

  if (storeApiContext.salesChannelStockLocationLinked) {
    pushUnique(
      created.includes("sales_channel_stock_location_link")
        ? created
        : existing,
      "sales_channel_stock_location_link",
    );
  } else {
    pushUnique(blockers, "sales_channel_stock_location_link_missing");
  }

  return {
    salesChannelStockLocationLinked:
      storeApiContext.salesChannelStockLocationLinked,
    salesChannelFulfillmentSetIds: storeApiContext.salesChannelFulfillmentSetIds,
  };
}

async function findStockLocationFulfillmentSetIds(
  query: any,
  stockLocationId: string | null,
): Promise<string[]> {
  if (!stockLocationId) return [];

  const stockLocation = (
    await safeGraph(
      query,
      "stock_location",
      ["id", "fulfillment_sets.id"],
      { id: stockLocationId },
      1,
    )
  )[0];

  return Array.from(
    new Set(
      asArray<Record<string, unknown>>(stockLocation?.fulfillment_sets)
        .map(getId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
}

async function proveStoreApiShippingOptionContext(
  container: any,
  shippingOptionId: string | null,
  salesChannelFulfillmentSetIds: string[],
): Promise<{ ready: boolean; reason: string | null; optionIds: string[] }> {
  if (!shippingOptionId) {
    return { ready: false, reason: "shipping_option_missing", optionIds: [] };
  }
  if (salesChannelFulfillmentSetIds.length === 0) {
    return {
      ready: false,
      reason: "sales_channel_fulfillment_sets_missing_for_store_api_filter",
      optionIds: [],
    };
  }

  try {
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
    const options = await fulfillmentModule.listShippingOptionsForContext({
      context: {
        is_return: "false",
        enabled_in_store: "true",
      },
      fulfillment_set_id: salesChannelFulfillmentSetIds,
      address: {
        country_code: DEFAULT_COUNTRY_CODE,
        province_code: "NY",
        city: "New York",
        postal_expression: "10001",
      },
    });
    const optionIds = asArray<Record<string, unknown>>(options)
      .map(getId)
      .filter((id): id is string => Boolean(id));

    if (optionIds.includes(shippingOptionId)) {
      return { ready: true, reason: null, optionIds };
    }

    return {
      ready: false,
      reason: `target_shipping_option_not_returned_for_store_context:${optionIds.join(",") || "none"}`,
      optionIds,
    };
  } catch (error) {
    return {
      ready: false,
      reason: `store_context_probe_failed:${errorMessage(error)}`,
      optionIds: [],
    };
  }
}

async function findEnabledProviderIdsForStockLocation(
  query: any,
  stockLocationId: string | null,
): Promise<string[]> {
  if (!stockLocationId) return [];

  const stockLocation = (
    await safeGraph(
      query,
      "stock_location",
      ["id", "fulfillment_providers.id"],
      { id: stockLocationId },
      1,
    )
  )[0];

  return asArray<Record<string, unknown>>(stockLocation?.fulfillment_providers)
    .map(getId)
    .filter((id): id is string => Boolean(id));
}

async function findEnabledProviderIdsForServiceZone(
  query: any,
  serviceZoneId: string | null,
  stockLocationId: string | null,
): Promise<string[]> {
  if (!serviceZoneId) return [];

  const serviceZone = (
    await safeGraph(
      query,
      "service_zone",
      [
        "id",
        "fulfillment_set.locations.id",
        "fulfillment_set.locations.fulfillment_providers.id",
      ],
      { id: serviceZoneId },
      1,
    )
  )[0];

  const locations = asArray<Record<string, unknown>>(
    isRecord(serviceZone?.fulfillment_set)
      ? serviceZone.fulfillment_set.locations
      : undefined,
  );

  const providerIds = locations
    .filter(
      (location) => !stockLocationId || getId(location) === stockLocationId,
    )
    .flatMap((location) =>
      asArray<Record<string, unknown>>(location.fulfillment_providers)
        .map(getId)
        .filter((id): id is string => Boolean(id)),
    );

  return Array.from(new Set(providerIds));
}

async function findServiceZone(
  query: any,
  serviceZoneId: string | null,
): Promise<Record<string, unknown> | undefined> {
  if (!serviceZoneId) return undefined;

  return (
    await safeGraph(
      query,
      "service_zone",
      [
        "id",
        "name",
        "geo_zones.id",
        "geo_zones.type",
        "geo_zones.country_code",
        "fulfillment_set.id",
        "fulfillment_set.locations.id",
        "fulfillment_set.locations.fulfillment_providers.id",
      ],
      { id: serviceZoneId },
      1,
    )
  )[0];
}

const getServiceZoneFulfillmentSetId = (serviceZone: unknown): string | null =>
  getId(isRecord(serviceZone) ? serviceZone.fulfillment_set : undefined);

const getServiceZoneTargetLocation = (
  serviceZone: unknown,
  stockLocationId: string | null,
): Record<string, unknown> | undefined =>
  asArray<Record<string, unknown>>(
    isRecord(serviceZone) && isRecord(serviceZone.fulfillment_set)
      ? serviceZone.fulfillment_set.locations
      : undefined,
  )
    .filter(isRecord)
    .find(
      (location) => !stockLocationId || getId(location) === stockLocationId,
    );

const getProviderIdsFromLocation = (location: unknown): string[] =>
  Array.from(
    new Set(
      asArray<Record<string, unknown>>(
        isRecord(location) ? location.fulfillment_providers : undefined,
      )
        .map(getId)
        .filter((id): id is string => Boolean(id)),
    ),
  );

const toJsonSafe = (value: unknown, seen = new WeakSet<object>()): unknown => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return undefined;
  if (typeof value === "function")
    return `[Function ${value.name || "anonymous"}]`;
  if (!isRecord(value)) return String(value);
  if (seen.has(value)) return "[Circular]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => toJsonSafe(item, seen));

  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, toJsonSafe(entry, seen)]),
  );
};

export const serializeProviderLinkRepairError = (
  error: unknown,
): Record<string, unknown> => {
  const errorRecord = isRecord(error) ? error : {};
  return Object.fromEntries(
    Object.entries({
      name:
        error instanceof Error
          ? error.name
          : typeof errorRecord.name === "string"
            ? errorRecord.name
            : undefined,
      message:
        error instanceof Error
          ? error.message
          : typeof errorRecord.message === "string"
            ? errorRecord.message
            : String(error),
      code: errorRecord.code,
      type: errorRecord.type,
      stack:
        typeof errorRecord.stack === "string"
          ? errorRecord.stack.split("\n").slice(0, 5)
          : undefined,
      cause: toJsonSafe(errorRecord.cause),
      details: toJsonSafe(errorRecord.details),
      rawKeys: isRecord(error) ? Object.keys(error) : [],
    }).filter(([, value]) => typeof value !== "undefined"),
  );
};

const errorMessage = (error: unknown): string => {
  const serialized = serializeProviderLinkRepairError(error);
  return typeof serialized.message === "string"
    ? serialized.message
    : JSON.stringify(serialized);
};

export const REDIS_UNAVAILABLE_BLOCKER = "redis_unavailable_or_quota_exceeded";

const REDIS_ERROR_PATTERNS = [
  "err max requests limit exceeded",
  "max requests limit exceeded",
  "quota",
  "upstash",
  "redis",
  "econnrefused",
  "connection is closed",
  "connection timeout",
  "connect etimedout",
  "read econnreset",
  "ioredis",
];

export const isRedisUnavailableOrQuotaError = (error: unknown): boolean => {
  const serialized = JSON.stringify(toJsonSafe(error)).toLowerCase();
  const message = errorMessage(error).toLowerCase();
  return REDIS_ERROR_PATTERNS.some(
    (pattern) => message.includes(pattern) || serialized.includes(pattern),
  );
};

const addWorkflowErrorBlocker = (
  blockers: string[],
  operation: string,
  error: unknown,
) => {
  if (isRedisUnavailableOrQuotaError(error)) {
    pushUnique(blockers, REDIS_UNAVAILABLE_BLOCKER);
    return;
  }

  pushUnique(blockers, `${operation}_failed:${errorMessage(error)}`);
};

async function diagnoseServiceZoneProviderMismatch(
  query: any,
  serviceZoneId: string | null,
  stockLocationId: string | null,
  fulfillmentSetId: string | null,
  serviceZone: Record<string, unknown> | undefined,
): Promise<string[]> {
  const diagnoses: string[] = [];
  if (TARGET_SERVICE_ZONE_ID && serviceZoneId && serviceZoneId !== TARGET_SERVICE_ZONE_ID) {
    pushUnique(diagnoses, "wrong_service_zone_selected");
  }

  const refetchedServiceZone =
    (await findServiceZone(query, serviceZoneId)) || serviceZone;
  const serviceZoneFulfillmentSetId =
    getServiceZoneFulfillmentSetId(refetchedServiceZone);

  if (
    fulfillmentSetId &&
    serviceZoneFulfillmentSetId &&
    fulfillmentSetId !== serviceZoneFulfillmentSetId
  ) {
    pushUnique(diagnoses, "wrong_fulfillment_set_selected");
    pushUnique(diagnoses, "service_zone_attached_to_different_fulfillment_set");
  }

  const stockLocation = (
    await safeGraph(
      query,
      "stock_location",
      ["id", "fulfillment_sets.id"],
      stockLocationId ? { id: stockLocationId } : undefined,
      1,
    )
  )[0];
  const stockLocationFulfillmentSetIds = asArray<Record<string, unknown>>(
    stockLocation?.fulfillment_sets,
  )
    .map(getId)
    .filter((id): id is string => Boolean(id));

  if (
    serviceZoneFulfillmentSetId &&
    stockLocationFulfillmentSetIds.length > 0 &&
    !stockLocationFulfillmentSetIds.includes(serviceZoneFulfillmentSetId)
  ) {
    pushUnique(
      diagnoses,
      "stock_location_attached_to_different_fulfillment_set",
    );
  }

  if (
    stockLocationId &&
    refetchedServiceZone &&
    !getServiceZoneTargetLocation(refetchedServiceZone, stockLocationId)
  ) {
    pushUnique(diagnoses, "service_zone_target_stock_location_missing");
  }

  return diagnoses;
}

type ProviderLinkRepairInput = {
  [Modules.STOCK_LOCATION]: { stock_location_id: string };
  [Modules.FULFILLMENT]: { fulfillment_provider_id: string };
};

const buildProviderLinkInput = (
  stockLocationId: string,
  fulfillmentProviderId: string,
): ProviderLinkRepairInput => ({
  [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
  [Modules.FULFILLMENT]: { fulfillment_provider_id: fulfillmentProviderId },
});

async function linkProviderToStockLocation(
  container: any,
  linkInput: ProviderLinkRepairInput,
): Promise<boolean> {
  // Medusa v2.13.6 admin POST /admin/stock-locations/:id/fulfillment-providers
  // builds this STOCK_LOCATION <-> FULFILLMENT link definition and passes it to
  // batchLinksWorkflow({ create: [definition], delete: [...] }). The direct
  // Link.create API accepts the same link definition array without invoking the
  // Redis-backed workflow engine, which keeps this ensure script safe when Redis
  // quota is exhausted.
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const existingLinks = await link.list([linkInput], {
    asLinkDefinition: true,
  });
  if (asArray(existingLinks).length > 0) return false;

  await link.create([linkInput]);
  return true;
}

async function ensureRequiredShippingOptionRules(
  container: any,
  shippingOption: Record<string, unknown> | undefined,
  blockers: string[],
  created: string[],
): Promise<boolean> {
  const shippingOptionId = getId(shippingOption);
  if (!shippingOptionId) return false;

  const rules = asArray<Record<string, unknown>>(shippingOption?.rules).filter(
    isRecord,
  );
  const blockingRuleIds = rules
    .filter((rule) => String(rule.attribute || "") === "region_id")
    .map(getId)
    .filter((id): id is string => Boolean(id));
  const requiredRules = [
    { attribute: "is_return", operator: "eq", value: "false" },
    { attribute: "enabled_in_store", operator: "eq", value: "true" },
  ];
  const creates: Record<string, unknown>[] = [];
  const updates: Record<string, unknown>[] = [];

  for (const requiredRule of requiredRules) {
    const existingRule = rules.find(
      (rule) => String(rule.attribute || "") === requiredRule.attribute,
    );
    const existingRuleId = getId(existingRule);
    if (!existingRuleId) {
      creates.push({ shipping_option_id: shippingOptionId, ...requiredRule });
      continue;
    }

    if (
      String(existingRule?.operator || "") !== requiredRule.operator ||
      String(existingRule?.value || "") !== requiredRule.value
    ) {
      updates.push({ id: existingRuleId, ...requiredRule });
    }
  }

  if (blockingRuleIds.length === 0 && creates.length === 0 && updates.length === 0) {
    return false;
  }

  try {
    const fulfillmentModule = container.resolve(Modules.FULFILLMENT);
    if (blockingRuleIds.length > 0) {
      await fulfillmentModule.deleteShippingOptionRules(blockingRuleIds);
    }
    if (updates.length > 0) {
      await fulfillmentModule.updateShippingOptionRules(updates as any);
    }
    if (creates.length > 0) {
      await fulfillmentModule.createShippingOptionRules(creates as any);
    }
    pushUnique(created, "shipping_option_store_visibility_rule_repair");
    return true;
  } catch (error) {
    addWorkflowErrorBlocker(blockers, "shipping_option_rule_repair", error);
    return false;
  }
}

const hasUsdFlatRatePrice = (shippingOption: unknown): boolean => {
  const prices = asArray<Record<string, unknown>>(
    isRecord(shippingOption) ? shippingOption.prices : undefined,
  );

  return prices.some(
    (price) =>
      String(price.currency_code || "").toLowerCase() === "usd" &&
      Number.isFinite(Number(price.amount)) &&
      Number(price.amount) >= 0,
  );
};

const hasRequiredStoreVisibleRules = (shippingOption: unknown): boolean => {
  const rules = asArray<Record<string, unknown>>(
    isRecord(shippingOption) ? shippingOption.rules : undefined,
  );
  const enabledInStore = rules.some(
    (rule) =>
      String(rule.attribute || "") === "enabled_in_store" &&
      String(rule.operator || "") === "eq" &&
      String(rule.value || "") === "true",
  );
  const nonReturn = rules.some(
    (rule) =>
      String(rule.attribute || "") === "is_return" &&
      String(rule.operator || "") === "eq" &&
      String(rule.value || "") === "false",
  );
  const noStoreBlockingRules = rules.every((rule) => {
    const attribute = String(rule.attribute || "");
    return attribute === "enabled_in_store" || attribute === "is_return";
  });

  return enabledInStore && nonReturn && noStoreBlockingRules;
};

async function findShippingOptions(
  query: any,
  serviceZoneId: string | null,
  shippingProfileId: string | null,
  fulfillmentProviderId: string | null,
) {
  const shippingOptions = await safeGraph(
    query,
    "shipping_option",
    [
      "id",
      "name",
      "service_zone_id",
      "shipping_profile_id",
      "provider_id",
      "price_type",
      "rules.id",
      "rules.attribute",
      "rules.operator",
      "rules.value",
      "prices.id",
      "prices.currency_code",
      "prices.amount",
      "prices.price_rules.id",
      "prices.price_rules.attribute",
      "prices.price_rules.value",
      "service_zone.id",
      "shipping_profile.id",
    ],
    undefined,
    100,
  );

  return shippingOptions.filter((option) => {
    const optionServiceZoneId =
      typeof option.service_zone_id === "string"
        ? option.service_zone_id
        : getId(option.service_zone);
    const optionShippingProfileId =
      typeof option.shipping_profile_id === "string"
        ? option.shipping_profile_id
        : getId(option.shipping_profile);

    return (
      option.name === DEFAULT_SHIPPING_OPTION_NAME &&
      (!serviceZoneId || optionServiceZoneId === serviceZoneId) &&
      (!shippingProfileId || optionShippingProfileId === shippingProfileId) &&
      (!fulfillmentProviderId || option.provider_id === fulfillmentProviderId)
    );
  });
}

function scoreShippingOption(option: Record<string, unknown>): number {
  return [
    hasRequiredStoreVisibleRules(option),
    hasUsdFlatRatePrice(option),
    String(option.price_type || "") === "flat",
  ].filter(Boolean).length;
}

async function findShippingOption(
  query: any,
  serviceZoneId: string | null,
  shippingProfileId: string | null,
  fulfillmentProviderId: string | null,
) {
  return (
    await findShippingOptions(
      query,
      serviceZoneId,
      shippingProfileId,
      fulfillmentProviderId,
    )
  ).sort((left, right) => scoreShippingOption(right) - scoreShippingOption(left))[0];
}


async function ensureLaunchRegion(
  container: any,
  query: any,
  repair: boolean,
  created: string[],
  existing: string[],
  blockers: string[],
): Promise<string | null> {
  let region = (await safeGraph(query, "region", ["id", "name", "currency_code", "countries.iso_2"], TARGET_REGION_ID ? { id: TARGET_REGION_ID } : undefined, 100)).find((item) => {
    const countries = asArray<Record<string, unknown>>(item.countries);
    return getId(item) === TARGET_REGION_ID || item.name === DEFAULT_REGION_NAME || countries.some((country) => String(country.iso_2 || "").toLowerCase() === DEFAULT_COUNTRY_CODE);
  });
  let regionId = getId(region);
  if (!regionId && repair) {
    try {
      const createdRegion = await createRegionsWorkflow(container).run({
        input: { regions: [{ name: DEFAULT_REGION_NAME, currency_code: "usd", countries: [DEFAULT_COUNTRY_CODE], payment_providers: ["pp_system_default"] }] },
      });
      region = asArray<Record<string, unknown>>(createdRegion.result)[0];
      regionId = getId(region);
      if (regionId) pushUnique(created, "region");
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "region_create", error);
    }
  }
  if (regionId) pushUnique(created.includes("region") ? created : existing, "region");
  else pushUnique(blockers, "region_missing");
  return regionId;
}

async function ensureLaunchSalesChannel(
  container: any,
  query: any,
  repair: boolean,
  created: string[],
  existing: string[],
  blockers: string[],
  regionId: string | null,
): Promise<string | null> {
  let salesChannel = (await safeGraph(query, "sales_channel", ["id", "name", "is_default"], TARGET_SALES_CHANNEL_ID ? { id: TARGET_SALES_CHANNEL_ID } : undefined, 100)).find((item) => getId(item) === TARGET_SALES_CHANNEL_ID || item.name === DEFAULT_SALES_CHANNEL_NAME || item.is_default === true);
  let salesChannelId = getId(salesChannel);
  if (!salesChannelId && repair) {
    try {
      const createdChannel = await createSalesChannelsWorkflow(container).run({ input: { salesChannelsData: [{ name: DEFAULT_SALES_CHANNEL_NAME, description: "Default sales channel for dBaronX storefront" }] } });
      salesChannel = asArray<Record<string, unknown>>(createdChannel.result)[0];
      salesChannelId = getId(salesChannel);
      if (salesChannelId) pushUnique(created, "sales_channel");
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "sales_channel_create", error);
    }
  }
  if (salesChannelId) {
    pushUnique(created.includes("sales_channel") ? created : existing, "sales_channel");
    if (repair) {
      try {
        await updateStoresWorkflow(container).run({ input: { selector: {}, update: { ...(regionId ? { default_region_id: regionId } : {}), supported_currencies: [{ currency_code: "usd", is_default: true }] } } });
        pushUnique(created, "store_region_and_usd_currency");
      } catch (error) {
        addWorkflowErrorBlocker(blockers, "store_defaults_update", error);
      }
    }
  } else pushUnique(blockers, "sales_channel_missing");
  return salesChannelId;
}

async function ensureLaunchShippingProfile(
  container: any,
  query: any,
  repair: boolean,
  created: string[],
  existing: string[],
  blockers: string[],
): Promise<string | null> {
  let profile = (await safeGraph(query, "shipping_profile", ["id", "name", "type"], TARGET_SHIPPING_PROFILE_ID ? { id: TARGET_SHIPPING_PROFILE_ID } : undefined, 100)).find((item) => getId(item) === TARGET_SHIPPING_PROFILE_ID || item.name === DEFAULT_SHIPPING_PROFILE_NAME || item.type === "default");
  let profileId = getId(profile);
  if (!profileId && repair) {
    try {
      const createdProfile = await createShippingProfilesWorkflow(container).run({ input: { data: [{ name: DEFAULT_SHIPPING_PROFILE_NAME, type: "default" }] } });
      profile = asArray<Record<string, unknown>>(createdProfile.result)[0];
      profileId = getId(profile);
      if (profileId) pushUnique(created, "shipping_profile");
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "shipping_profile_create", error);
    }
  }
  if (profileId) pushUnique(created.includes("shipping_profile") ? created : existing, "shipping_profile");
  else pushUnique(blockers, "shipping_profile_missing");
  return profileId;
}

async function ensureLaunchStockLocation(
  container: any,
  query: any,
  repair: boolean,
  created: string[],
  existing: string[],
  blockers: string[],
): Promise<string | null> {
  let location = (await safeGraph(query, "stock_location", ["id", "name"], TARGET_STOCK_LOCATION_ID ? { id: TARGET_STOCK_LOCATION_ID } : undefined, 100)).find((item) => getId(item) === TARGET_STOCK_LOCATION_ID || item.name === DEFAULT_STOCK_LOCATION_NAME || item.name === "dBaronX Main Warehouse");
  let locationId = getId(location);
  if (!locationId && repair) {
    try {
      const createdLocation = await createStockLocationsWorkflow(container).run({ input: { locations: [{ name: DEFAULT_STOCK_LOCATION_NAME, address: { address_1: "dBaronX Launch Fulfillment Hub", city: "New York", country_code: DEFAULT_COUNTRY_CODE } }] } });
      location = asArray<Record<string, unknown>>(createdLocation.result)[0];
      locationId = getId(location);
      if (locationId) pushUnique(created, "stock_location");
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "stock_location_create", error);
    }
  }
  if (locationId) pushUnique(created.includes("stock_location") ? created : existing, "stock_location");
  else pushUnique(blockers, "stock_location_missing");
  return locationId;
}


export async function ensureShippingReadiness(
  container: any,
  options: EnsureShippingReadinessOptions = {},
): Promise<EnsureShippingReadinessResult> {
  const repair = options.repair ?? true;
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const created: string[] = [];
  const existing: string[] = [];
  const blockers: string[] = [];
  let stockLocationProviderIds: string[] = [];
  let serviceZoneProviderIds: string[] = [];
  let attemptedProviderLink = false;
  let providerLinkCreated = false;
  let providerLinkVerifiedAfterRefetch = false;
  let providerLinkRepairError: Record<string, unknown> | undefined;
  let providerLinkWorkflowUsed: string | null = null;
  let providerLinkInputPreview: Record<string, unknown> | null = null;
  let salesChannelStockLocationLinked = false;
  let fulfillmentSetIdsFromStockLocation: string[] = [];
  let salesChannelFulfillmentSetIds: string[] = [];
  let fulfillmentSetReachableFromSalesChannel = false;

  const regionId = await ensureLaunchRegion(
    container,
    query,
    repair,
    created,
    existing,
    blockers,
  );
  const salesChannelId = await ensureLaunchSalesChannel(
    container,
    query,
    repair,
    created,
    existing,
    blockers,
    regionId,
  );
  const shippingProfileId = await ensureLaunchShippingProfile(
    container,
    query,
    repair,
    created,
    existing,
    blockers,
  );
  const stockLocationId = await ensureLaunchStockLocation(
    container,
    query,
    repair,
    created,
    existing,
    blockers,
  );

  const salesChannelLink = await ensureSalesChannelStockLocationLink(
    container,
    query,
    stockLocationId,
    salesChannelId,
    repair,
    created,
    existing,
    blockers,
  );
  salesChannelStockLocationLinked =
    salesChannelLink.salesChannelStockLocationLinked;
  salesChannelFulfillmentSetIds =
    salesChannelLink.salesChannelFulfillmentSetIds;

  const allFulfillmentProviderRecords = await findFulfillmentProviders(query);
  const allFulfillmentProviderIds = allFulfillmentProviderRecords
    .map(getId)
    .filter((id): id is string => Boolean(id));

  let fulfillmentProviderId: string | null = null;
  let selectedFulfillmentProviderId: string | null = null;
  let selectedFulfillmentProviderSource: string | null = null;

  let enabledProviderIds = await findEnabledProviderIdsForStockLocation(
    query,
    stockLocationId,
  );
  stockLocationProviderIds = enabledProviderIds;
  let providerEnabledForServiceLocation = false;
  let fulfillmentProviderReady = false;

  let fulfillmentSet = stockLocationId
    ? await findStockLocationFulfillmentSet(query, stockLocationId)
    : undefined;
  let fulfillmentSetId = getId(fulfillmentSet);
  fulfillmentSetIdsFromStockLocation = await findStockLocationFulfillmentSetIds(
    query,
    stockLocationId,
  );

  if (!fulfillmentSetId && repair && stockLocationId) {
    try {
      await createLocationFulfillmentSetWorkflow(container).run({
        input: {
          location_id: stockLocationId,
          fulfillment_set_data: {
            name: DEFAULT_FULFILLMENT_SET_NAME,
            type: "shipping",
          },
        },
      });
      pushUnique(created, "fulfillment_set");
      fulfillmentSet = await findStockLocationFulfillmentSet(
        query,
        stockLocationId,
      );
      fulfillmentSetId = getId(fulfillmentSet);
      fulfillmentSetIdsFromStockLocation = await findStockLocationFulfillmentSetIds(
        query,
        stockLocationId,
      );
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "fulfillment_set_create", error);
    }
  }

  if (fulfillmentSetId)
    pushUnique(
      fulfillmentSet && created.includes("fulfillment_set")
        ? created
        : existing,
      "fulfillment_set",
    );
  else pushUnique(blockers, "fulfillment_set_missing");

  const refreshedSalesChannelLink = await ensureSalesChannelStockLocationLink(
    container,
    query,
    stockLocationId,
    salesChannelId,
    repair,
    created,
    existing,
    blockers,
  );
  salesChannelStockLocationLinked =
    refreshedSalesChannelLink.salesChannelStockLocationLinked;
  salesChannelFulfillmentSetIds =
    refreshedSalesChannelLink.salesChannelFulfillmentSetIds;
  fulfillmentSetReachableFromSalesChannel = fulfillmentSetIdsFromStockLocation.some(
    (id) => salesChannelFulfillmentSetIds.includes(id),
  );
  if (fulfillmentSetIdsFromStockLocation.length === 0) {
    pushUnique(blockers, "stock_location_fulfillment_sets_missing");
  }
  if (fulfillmentSetId && !fulfillmentSetReachableFromSalesChannel) {
    pushUnique(blockers, "fulfillment_set_not_reachable_from_sales_channel");
  }

  let serviceZone = findUsServiceZone(fulfillmentSet);
  let serviceZoneId = getId(serviceZone);
  let serviceZoneReady = Boolean(
    serviceZoneId && hasCountryGeoZone(serviceZone),
  );

  if (serviceZoneId && !serviceZoneReady && repair) {
    try {
      const updated = await updateServiceZonesWorkflow(container).run({
        input: {
          selector: { id: serviceZoneId },
          update: {
            name: DEFAULT_SERVICE_ZONE_NAME,
            geo_zones: [
              { type: "country", country_code: DEFAULT_COUNTRY_CODE },
            ],
          },
        } as any,
      });
      serviceZone =
        asArray<Record<string, unknown>>(updated.result).find(
          (zone) => getId(zone) === serviceZoneId,
        ) || serviceZone;
      pushUnique(created, "service_zone_geo_zone");
      fulfillmentSet = stockLocationId
        ? await findStockLocationFulfillmentSet(query, stockLocationId)
        : fulfillmentSet;
      serviceZone = findUsServiceZone(fulfillmentSet) || serviceZone;
      serviceZoneReady = Boolean(
        getId(serviceZone) && hasCountryGeoZone(serviceZone),
      );
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "service_zone_update", error);
    }
  }

  if (!serviceZoneId && repair && fulfillmentSetId) {
    try {
      const createdZone = await createServiceZonesWorkflow(container).run({
        input: {
          data: [
            {
              name: DEFAULT_SERVICE_ZONE_NAME,
              fulfillment_set_id: fulfillmentSetId,
              geo_zones: [
                { type: "country", country_code: DEFAULT_COUNTRY_CODE },
              ],
            },
          ],
        },
      });
      serviceZone = asArray<Record<string, unknown>>(createdZone.result)[0];
      serviceZoneId = getId(serviceZone);
      pushUnique(created, "service_zone");
      fulfillmentSet = stockLocationId
        ? await findStockLocationFulfillmentSet(query, stockLocationId)
        : fulfillmentSet;
      serviceZone = findUsServiceZone(fulfillmentSet) || serviceZone;
      serviceZoneReady = Boolean(
        getId(serviceZone) && hasCountryGeoZone(serviceZone),
      );
    } catch (error) {
      addWorkflowErrorBlocker(blockers, "service_zone_create", error);
    }
  }

  serviceZoneId = getId(serviceZone);
  if (TARGET_SERVICE_ZONE_ID && serviceZoneId && serviceZoneId !== TARGET_SERVICE_ZONE_ID) {
    pushUnique(blockers, "wrong_service_zone_selected");
  }
  if (serviceZoneReady)
    pushUnique(
      created.includes("service_zone") ? created : existing,
      "service_zone",
    );
  else pushUnique(blockers, "service_zone_missing");

  let serviceZoneEnabledProviderIds = serviceZoneId
    ? await findEnabledProviderIdsForServiceZone(
        query,
        serviceZoneId,
        stockLocationId,
      )
    : [];
  serviceZoneProviderIds = serviceZoneEnabledProviderIds;

  const selectedFulfillmentProvider = selectFulfillmentProviderId(
    allFulfillmentProviderRecords,
    enabledProviderIds,
    serviceZoneEnabledProviderIds,
  );
  selectedFulfillmentProviderId =
    selectedFulfillmentProvider.selectedFulfillmentProviderId;
  selectedFulfillmentProviderSource =
    selectedFulfillmentProvider.selectedFulfillmentProviderSource;
  fulfillmentProviderId = selectedFulfillmentProviderId;

  if (!selectedFulfillmentProviderId) {
    pushUnique(blockers, "fulfillment_provider_missing_or_disabled");
  }

  providerEnabledForServiceLocation = Boolean(
    selectedFulfillmentProviderId &&
    enabledProviderIds.includes(selectedFulfillmentProviderId) &&
    serviceZoneEnabledProviderIds.includes(selectedFulfillmentProviderId),
  );

  if (
    fulfillmentProviderId &&
    !providerEnabledForServiceLocation &&
    repair &&
    stockLocationId &&
    serviceZoneId
  ) {
    attemptedProviderLink = true;
    const providerWasLinkedBeforeRepair = serviceZoneProviderIds.includes(
      fulfillmentProviderId,
    );
    const providerLinkInput = buildProviderLinkInput(
      stockLocationId,
      fulfillmentProviderId,
    );
    providerLinkWorkflowUsed = "Link.create";
    providerLinkInputPreview = {
      api: "ContainerRegistrationKeys.LINK.create",
      input: [providerLinkInput],
    };

    try {
      providerLinkCreated = await linkProviderToStockLocation(
        container,
        providerLinkInput,
      );
    } catch (error) {
      providerLinkRepairError = serializeProviderLinkRepairError(error);
      if (isRedisUnavailableOrQuotaError(error)) {
        pushUnique(blockers, REDIS_UNAVAILABLE_BLOCKER);
      }
    }

    enabledProviderIds = await findEnabledProviderIdsForStockLocation(
      query,
      stockLocationId,
    );
    stockLocationProviderIds = enabledProviderIds;
    serviceZone = (await findServiceZone(query, serviceZoneId)) || serviceZone;
    serviceZoneReady = Boolean(
      getId(serviceZone) && hasCountryGeoZone(serviceZone),
    );
    serviceZoneEnabledProviderIds = await findEnabledProviderIdsForServiceZone(
      query,
      serviceZoneId,
      stockLocationId,
    );
    serviceZoneProviderIds = serviceZoneEnabledProviderIds;

    const stockLocationProviderVerified = enabledProviderIds.includes(
      fulfillmentProviderId,
    );
    const serviceZoneLocation = getServiceZoneTargetLocation(
      serviceZone,
      stockLocationId,
    );
    const serviceZoneProviderVerified = getProviderIdsFromLocation(
      serviceZoneLocation,
    ).includes(fulfillmentProviderId);

    providerLinkVerifiedAfterRefetch = Boolean(
      stockLocationProviderVerified && serviceZoneProviderVerified,
    );
    providerEnabledForServiceLocation = providerLinkVerifiedAfterRefetch;
    providerLinkCreated = Boolean(
      providerEnabledForServiceLocation &&
      (providerLinkCreated || !providerWasLinkedBeforeRepair),
    );

    if (providerEnabledForServiceLocation) {
      pushUnique(created, "stock_location_fulfillment_provider_link");
    } else if (stockLocationProviderVerified && !serviceZoneProviderVerified) {
      for (const diagnosis of await diagnoseServiceZoneProviderMismatch(
        query,
        serviceZoneId,
        stockLocationId,
        fulfillmentSetId,
        serviceZone,
      )) {
        pushUnique(blockers, diagnosis);
      }
    }
  }

  if (!attemptedProviderLink && fulfillmentProviderId) {
    providerLinkVerifiedAfterRefetch = Boolean(
      stockLocationProviderIds.includes(fulfillmentProviderId) &&
      serviceZoneProviderIds.includes(fulfillmentProviderId),
    );
    providerEnabledForServiceLocation = providerLinkVerifiedAfterRefetch;
  }

  fulfillmentProviderReady = Boolean(
    selectedFulfillmentProviderId && providerEnabledForServiceLocation,
  );

  if (fulfillmentProviderReady) {
    pushUnique(
      created.includes("stock_location_fulfillment_provider_link") ||
        !enabledProviderIds.includes(fulfillmentProviderId!)
        ? created
        : existing,
      "fulfillment_provider",
    );
  } else if (selectedFulfillmentProviderId) {
    pushUnique(
      blockers,
      "fulfillment_provider_not_enabled_for_service_location",
    );
  }

  let shippingOption =
    serviceZoneId && shippingProfileId
      ? await findShippingOption(
          query,
          serviceZoneId,
          shippingProfileId,
          fulfillmentProviderId,
        )
      : undefined;
  let shippingOptionId = getId(shippingOption);

  const createShippingOptionsWorkflowInput =
    regionId && shippingProfileId && fulfillmentProviderId && serviceZoneId
      ? [
          {
            name: DEFAULT_SHIPPING_OPTION_NAME,
            service_zone_id: serviceZoneId,
            shipping_profile_id: shippingProfileId,
            provider_id: fulfillmentProviderId,
            type: {
              label: "Standard",
              description: "Flat rate delivery for dBaronX launch orders",
              code: "dbx_standard_delivery",
            },
            price_type: "flat",
            prices: [{ currency_code: "usd", amount: 0 }],
            rules: [
              { attribute: "is_return", operator: "eq", value: "false" },
              { attribute: "enabled_in_store", operator: "eq", value: "true" },
            ],
          },
        ]
      : null;

  const canCreateShippingOption = Boolean(
    regionId &&
    shippingProfileId &&
    fulfillmentProviderReady &&
    providerEnabledForServiceLocation &&
    serviceZoneReady &&
    serviceZoneId &&
    createShippingOptionsWorkflowInput,
  );
  if (!shippingOptionId && repair && canCreateShippingOption) {
    try {
      await createShippingOptionsWorkflow(container).run({
        input: createShippingOptionsWorkflowInput as any,
      });
      shippingOption = await findShippingOption(
        query,
        serviceZoneId,
        shippingProfileId,
        fulfillmentProviderId,
      );
      shippingOptionId = getId(shippingOption);
      if (shippingOptionId) pushUnique(created, "shipping_option");
    } catch (error) {
      shippingOptionId = null;
      addWorkflowErrorBlocker(blockers, "shipping_option_create", error);
    }
  }

  if (shippingOptionId && repair) {
    const rulesRepaired = await ensureRequiredShippingOptionRules(
      container,
      shippingOption,
      blockers,
      created,
    );
    if (rulesRepaired) {
      shippingOption = await findShippingOption(
        query,
        serviceZoneId,
        shippingProfileId,
        fulfillmentProviderId,
      );
      shippingOptionId = getId(shippingOption);
    }
  }

  const priceReady = hasUsdFlatRatePrice(shippingOption);
  const rulesReady = hasRequiredStoreVisibleRules(shippingOption);
  const storeApiVisibilityProof = await proveStoreApiShippingOptionContext(
    container,
    shippingOptionId,
    salesChannelFulfillmentSetIds,
  );
  const storeApiVisibilityProofReady = storeApiVisibilityProof.ready;
  const storeApiVisibilityProofReason = storeApiVisibilityProof.reason;
  const shippingOptionIdsVisibleToStoreContext = storeApiVisibilityProof.optionIds;
  const duplicateShippingOptionIds = serviceZoneId && shippingProfileId
    ? (await findShippingOptions(
        query,
        serviceZoneId,
        shippingProfileId,
        fulfillmentProviderId,
      ))
        .map(getId)
        .filter((id): id is string => Boolean(id))
        .filter((id) => id !== shippingOptionId)
    : [];
  const visibleToStoreApiExpected = Boolean(
    shippingOptionId &&
    priceReady &&
    rulesReady &&
    serviceZoneReady &&
    fulfillmentProviderReady &&
    providerEnabledForServiceLocation &&
    salesChannelStockLocationLinked &&
    fulfillmentSetReachableFromSalesChannel &&
    storeApiVisibilityProofReady,
  );
  const shippingOptionReady = Boolean(
    shippingOptionId && priceReady && rulesReady,
  );
  if (shippingOptionReady)
    pushUnique(
      created.includes("shipping_option") ? created : existing,
      "shipping_option",
    );
  else pushUnique(blockers, "shipping_option_missing");
  if (shippingOptionId && !priceReady)
    pushUnique(blockers, "shipping_option_usd_flat_rate_price_missing");
  if (shippingOptionId && !rulesReady)
    pushUnique(blockers, "shipping_option_store_visibility_rules_blocking");
  if (shippingOptionId && !storeApiVisibilityProofReady)
    pushUnique(
      blockers,
      `shipping_option_store_visibility_unverified:${storeApiVisibilityProofReason || "unknown"}`,
    );

  return {
    created,
    existing,
    blockers,
    regionId,
    salesChannelId,
    shippingProfileId,
    stockLocationId,
    shippingOptionId,
    fulfillmentProviderReady,
    fulfillmentProviderId,
    selectedFulfillmentProviderId,
    selectedFulfillmentProviderSource,
    allFulfillmentProviderIds,
    allFulfillmentProviderRecords,
    fulfillmentSetReady: Boolean(fulfillmentSetId),
    fulfillmentSetId,
    serviceZoneReady,
    serviceZoneId,
    shippingOptionReady,
    priceReady,
    rulesReady,
    visibleToStoreApiExpected,
    storeApiVisibilityProofReady,
    storeApiVisibilityProofReason,
    salesChannelStockLocationLinked,
    fulfillmentSetIdsFromStockLocation,
    salesChannelFulfillmentSetIds,
    fulfillmentSetReachableFromSalesChannel,
    providerEnabledForServiceLocation,
    stockLocationProviderIds,
    serviceZoneProviderIds,
    attemptedProviderLink,
    providerLinkCreated,
    providerLinkVerifiedAfterRefetch,
    providerLinkWorkflowUsed,
    providerLinkInputPreview,
    ...(providerLinkRepairError ? { providerLinkRepairError } : {}),
    createShippingOptionsWorkflowInput,
    shippingOptionIdsVisibleToStoreContext,
    duplicateShippingOptionIds,
  };
}
