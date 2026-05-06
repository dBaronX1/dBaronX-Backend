import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  batchLinksWorkflow,
  createLocationFulfillmentSetWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  updateServiceZonesWorkflow,
} from "@medusajs/medusa/core-flows";

export const TARGET_REGION_ID = "reg_01KQSEKK6A9T86NJ0AG05XPK3H";
export const TARGET_SHIPPING_PROFILE_ID = "sp_01KQNHSN2N8DDF782WRRDGJJF0";
export const TARGET_STOCK_LOCATION_ID = "sloc_01KQR5J1PYD7FZ1AF516W1VQWJ";

const DEFAULT_SHIPPING_OPTION_NAME = "dBaronX Standard Delivery";
const DEFAULT_SERVICE_ZONE_NAME = "dBaronX United States Delivery Zone";
const DEFAULT_FULFILLMENT_SET_NAME = "dBaronX Shipping";
const DEFAULT_COUNTRY_CODE = "us";

type EnsureShippingReadinessOptions = {
  repair?: boolean;
};

export type EnsureShippingReadinessResult = {
  created: string[];
  existing: string[];
  blockers: string[];
  regionId: string | null;
  shippingProfileId: string | null;
  stockLocationId: string | null;
  shippingOptionId: string | null;
  fulfillmentProviderReady: boolean;
  fulfillmentProviderId: string | null;
  fulfillmentSetReady: boolean;
  fulfillmentSetId: string | null;
  serviceZoneReady: boolean;
  serviceZoneId: string | null;
  shippingOptionReady: boolean;
  providerEnabledForServiceLocation: boolean;
  createShippingOptionsWorkflowInput: Record<string, unknown>[] | null;
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

async function findManualFulfillmentProvider(query: any) {
  const providers = await safeGraph(
    query,
    "fulfillment_provider",
    ["id"],
    undefined,
    50,
  );
  return (
    providers.find((provider) => getId(provider) === "manual_manual") ||
    providers[0]
  );
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

  const providerIds = locations.flatMap((location) =>
    asArray<Record<string, unknown>>(location.fulfillment_providers)
      .map(getId)
      .filter((id): id is string => Boolean(id)),
  );

  return Array.from(new Set(providerIds));
}

async function linkProviderToStockLocation(
  container: any,
  stockLocationId: string,
  fulfillmentProviderId: string,
): Promise<boolean> {
  await batchLinksWorkflow(container).run({
    input: {
      create: [
        {
          [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
          [Modules.FULFILLMENT]: {
            fulfillment_provider_id: fulfillmentProviderId,
          },
        },
      ],
    },
  });

  return true;
}

async function findShippingOption(
  query: any,
  serviceZoneId: string | null,
  shippingProfileId: string | null,
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
      "service_zone.id",
      "shipping_profile.id",
    ],
    undefined,
    100,
  );

  return shippingOptions.find((option) => {
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
      (!shippingProfileId || optionShippingProfileId === shippingProfileId)
    );
  });
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

  const region = (
    await safeGraph(
      query,
      "region",
      ["id", "name", "currency_code", "countries.iso_2"],
      { id: TARGET_REGION_ID },
      1,
    )
  )[0];
  const regionId = getId(region);
  if (regionId) pushUnique(existing, "region");
  else pushUnique(blockers, "region_missing");

  const shippingProfile = (
    await safeGraph(
      query,
      "shipping_profile",
      ["id", "name", "type"],
      { id: TARGET_SHIPPING_PROFILE_ID },
      1,
    )
  )[0];
  const shippingProfileId = getId(shippingProfile);
  if (shippingProfileId) pushUnique(existing, "shipping_profile");
  else pushUnique(blockers, "shipping_profile_missing");

  const stockLocation = (
    await safeGraph(
      query,
      "stock_location",
      ["id", "name"],
      { id: TARGET_STOCK_LOCATION_ID },
      1,
    )
  )[0];
  const stockLocationId = getId(stockLocation);
  if (stockLocationId) pushUnique(existing, "stock_location");
  else pushUnique(blockers, "stock_location_missing");

  const fulfillmentProvider = await findManualFulfillmentProvider(query);
  let fulfillmentProviderId = getId(fulfillmentProvider);
  if (!fulfillmentProviderId)
    pushUnique(blockers, "fulfillment_provider_missing");

  let enabledProviderIds = await findEnabledProviderIdsForStockLocation(
    query,
    stockLocationId,
  );
  let providerEnabledForServiceLocation = Boolean(
    fulfillmentProviderId && enabledProviderIds.includes(fulfillmentProviderId),
  );

  if (
    fulfillmentProviderId &&
    !providerEnabledForServiceLocation &&
    repair &&
    stockLocationId
  ) {
    try {
      await linkProviderToStockLocation(
        container,
        stockLocationId,
        fulfillmentProviderId,
      );
      enabledProviderIds = await findEnabledProviderIdsForStockLocation(
        query,
        stockLocationId,
      );
      providerEnabledForServiceLocation = enabledProviderIds.includes(
        fulfillmentProviderId,
      );
      if (providerEnabledForServiceLocation)
        pushUnique(created, "stock_location_fulfillment_provider_link");
    } catch {
      providerEnabledForServiceLocation = false;
    }
  }

  if (!providerEnabledForServiceLocation && enabledProviderIds.length > 0) {
    fulfillmentProviderId = enabledProviderIds[0];
    providerEnabledForServiceLocation = true;
  }

  let fulfillmentProviderReady = Boolean(
    fulfillmentProviderId && providerEnabledForServiceLocation,
  );
  if (fulfillmentProviderReady)
    pushUnique(
      created.includes("stock_location_fulfillment_provider_link")
        ? created
        : existing,
      "fulfillment_provider",
    );
  else if (fulfillmentProviderId)
    pushUnique(
      blockers,
      "fulfillment_provider_not_enabled_for_service_location",
    );

  let fulfillmentSet = stockLocationId
    ? await findStockLocationFulfillmentSet(query, stockLocationId)
    : undefined;
  let fulfillmentSetId = getId(fulfillmentSet);

  if (!fulfillmentSetId && repair && stockLocationId) {
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
  }

  if (fulfillmentSetId)
    pushUnique(
      fulfillmentSet && created.includes("fulfillment_set")
        ? created
        : existing,
      "fulfillment_set",
    );
  else pushUnique(blockers, "fulfillment_set_missing");

  let serviceZone = findUsServiceZone(fulfillmentSet);
  let serviceZoneId = getId(serviceZone);
  let serviceZoneReady = Boolean(
    serviceZoneId && hasCountryGeoZone(serviceZone),
  );

  if (serviceZoneId && !serviceZoneReady && repair) {
    const updated = await updateServiceZonesWorkflow(container).run({
      input: {
        selector: { id: serviceZoneId },
        update: {
          name: DEFAULT_SERVICE_ZONE_NAME,
          geo_zones: [{ type: "country", country_code: DEFAULT_COUNTRY_CODE }],
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
  }

  if (!serviceZoneId && repair && fulfillmentSetId) {
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
  }

  serviceZoneId = getId(serviceZone);
  if (serviceZoneReady)
    pushUnique(
      created.includes("service_zone") ? created : existing,
      "service_zone",
    );
  else pushUnique(blockers, "service_zone_missing");

  const serviceZoneEnabledProviderIds = serviceZoneId
    ? await findEnabledProviderIdsForServiceZone(query, serviceZoneId)
    : enabledProviderIds;
  providerEnabledForServiceLocation = Boolean(
    fulfillmentProviderId &&
    serviceZoneEnabledProviderIds.includes(fulfillmentProviderId),
  );

  if (
    !providerEnabledForServiceLocation &&
    serviceZoneEnabledProviderIds.length > 0
  ) {
    fulfillmentProviderId = serviceZoneEnabledProviderIds[0];
    providerEnabledForServiceLocation = true;
  }

  fulfillmentProviderReady = Boolean(
    fulfillmentProviderId && providerEnabledForServiceLocation,
  );

  if (!providerEnabledForServiceLocation && fulfillmentProviderId) {
    pushUnique(
      blockers,
      "fulfillment_provider_not_enabled_for_service_location",
    );
  }

  let shippingOption =
    serviceZoneId && shippingProfileId
      ? await findShippingOption(query, serviceZoneId, shippingProfileId)
      : undefined;
  let shippingOptionId = getId(shippingOption);
  const existingShippingOptionProviderId =
    typeof shippingOption?.provider_id === "string"
      ? shippingOption.provider_id
      : null;
  if (
    shippingOptionId &&
    existingShippingOptionProviderId &&
    !serviceZoneEnabledProviderIds.includes(existingShippingOptionProviderId)
  ) {
    shippingOptionId = null;
    pushUnique(
      blockers,
      "shipping_option_provider_not_enabled_for_service_location",
    );
  }

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
              { operator: "eq", attribute: "region_id", value: regionId },
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
    const createdOption = await createShippingOptionsWorkflow(container).run({
      input: createShippingOptionsWorkflowInput as any,
    });
    shippingOption = asArray<Record<string, unknown>>(createdOption.result)[0];
    shippingOptionId = getId(shippingOption);
    if (shippingOptionId) pushUnique(created, "shipping_option");
  }

  const shippingOptionReady = Boolean(shippingOptionId);
  if (shippingOptionReady)
    pushUnique(
      created.includes("shipping_option") ? created : existing,
      "shipping_option",
    );
  else pushUnique(blockers, "shipping_option_missing");

  return {
    created,
    existing,
    blockers,
    regionId,
    shippingProfileId,
    stockLocationId,
    shippingOptionId,
    fulfillmentProviderReady,
    fulfillmentProviderId,
    fulfillmentSetReady: Boolean(fulfillmentSetId),
    fulfillmentSetId,
    serviceZoneReady,
    serviceZoneId,
    shippingOptionReady,
    providerEnabledForServiceLocation,
    createShippingOptionsWorkflowInput,
  };
}
