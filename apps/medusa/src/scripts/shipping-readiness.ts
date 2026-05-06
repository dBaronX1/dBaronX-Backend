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
export const TARGET_SERVICE_ZONE_ID = "serzo_01KQY400PQPH3KZ6NMGQ5DYBY2";
export const PREFERRED_MANUAL_FULFILLMENT_PROVIDER_ID = "fp_manual_manual";

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
  selectedFulfillmentProviderId: string | null;
  selectedFulfillmentProviderSource: string | null;
  allFulfillmentProviderIds: string[];
  allFulfillmentProviderRecords: Record<string, unknown>[];
  fulfillmentSetReady: boolean;
  fulfillmentSetId: string | null;
  serviceZoneReady: boolean;
  serviceZoneId: string | null;
  shippingOptionReady: boolean;
  providerEnabledForServiceLocation: boolean;
  stockLocationProviderIds: string[];
  serviceZoneProviderIds: string[];
  attemptedProviderLink: boolean;
  providerLinkCreated: boolean;
  providerLinkVerifiedAfterRefetch: boolean;
  providerLinkRepairError?: Record<string, unknown>;
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
      selectedFulfillmentProviderSource: "preferred_fp_manual_manual",
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

async function diagnoseServiceZoneProviderMismatch(
  query: any,
  serviceZoneId: string | null,
  stockLocationId: string | null,
  fulfillmentSetId: string | null,
  serviceZone: Record<string, unknown> | undefined,
): Promise<string[]> {
  const diagnoses: string[] = [];
  if (serviceZoneId && serviceZoneId !== TARGET_SERVICE_ZONE_ID) {
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

async function linkProviderToStockLocation(
  container: any,
  stockLocationId: string,
  fulfillmentProviderId: string,
): Promise<boolean> {
  // Matches Medusa v2.13.6 admin POST
  // /admin/stock-locations/:id/fulfillment-providers, which calls
  // batchLinksWorkflow with this STOCK_LOCATION <-> FULFILLMENT link shape.
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
      (!shippingProfileId || optionShippingProfileId === shippingProfileId) &&
      (!fulfillmentProviderId || option.provider_id === fulfillmentProviderId)
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
  let stockLocationProviderIds: string[] = [];
  let serviceZoneProviderIds: string[] = [];
  let attemptedProviderLink = false;
  let providerLinkCreated = false;
  let providerLinkVerifiedAfterRefetch = false;
  let providerLinkRepairError: Record<string, unknown> | undefined;

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
  if (serviceZoneId && serviceZoneId !== TARGET_SERVICE_ZONE_ID) {
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
    try {
      await linkProviderToStockLocation(
        container,
        stockLocationId,
        fulfillmentProviderId,
      );
    } catch (error) {
      providerLinkRepairError = serializeProviderLinkRepairError(error);
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
      providerEnabledForServiceLocation && !providerWasLinkedBeforeRepair,
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
      pushUnique(
        blockers,
        `shipping_option_create_failed:${errorMessage(error)}`,
      );
    }
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
    selectedFulfillmentProviderId,
    selectedFulfillmentProviderSource,
    allFulfillmentProviderIds,
    allFulfillmentProviderRecords,
    fulfillmentSetReady: Boolean(fulfillmentSetId),
    fulfillmentSetId,
    serviceZoneReady,
    serviceZoneId,
    shippingOptionReady,
    providerEnabledForServiceLocation,
    stockLocationProviderIds,
    serviceZoneProviderIds,
    attemptedProviderLink,
    providerLinkCreated,
    providerLinkVerifiedAfterRefetch,
    ...(providerLinkRepairError ? { providerLinkRepairError } : {}),
    createShippingOptionsWorkflowInput,
  };
}
