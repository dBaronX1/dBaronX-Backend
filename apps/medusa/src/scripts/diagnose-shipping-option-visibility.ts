import { ExecArgs } from "@medusajs/framework/types";

import {
  ensureShippingReadiness,
  isRedisUnavailableOrQuotaError,
  REDIS_UNAVAILABLE_BLOCKER,
  serializeProviderLinkRepairError,
} from "./shipping-readiness";

export default async function diagnoseShippingOptionVisibility({ container }: ExecArgs) {
  try {
    const readiness = await ensureShippingReadiness(container, { repair: true });

    console.log(
      JSON.stringify(
        {
          success: readiness.blockers.length === 0 && readiness.visibleToStoreApiExpected,
          blockers: readiness.blockers,
          regionId: readiness.regionId,
          countryIso2: "us",
          serviceZoneId: readiness.serviceZoneId,
          fulfillmentProviderId: readiness.selectedFulfillmentProviderId || readiness.fulfillmentProviderId,
          stockLocationId: readiness.stockLocationId,
          salesChannelId: readiness.salesChannelId,
          shippingProfileId: readiness.shippingProfileId,
          shippingOptionId: readiness.shippingOptionId,
          priceReady: readiness.priceReady,
          rulesReady: readiness.rulesReady,
          visibleToStoreApiExpected: readiness.visibleToStoreApiExpected,
          created: readiness.created,
          existing: readiness.existing,
          medusaWorkflowOrModuleUsed: [
            "createLocationFulfillmentSetWorkflow",
            "createServiceZonesWorkflow",
            "updateServiceZonesWorkflow",
            "createShippingOptionsWorkflow",
            "ContainerRegistrationKeys.LINK.create",
            "Modules.FULFILLMENT.deleteShippingOptionRules",
          ],
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const blockers = isRedisUnavailableOrQuotaError(error)
      ? [REDIS_UNAVAILABLE_BLOCKER]
      : [`shipping_visibility_diagnose_failed:${String(serializeProviderLinkRepairError(error).message)}`];

    console.log(
      JSON.stringify(
        {
          success: false,
          blockers,
          regionId: null,
          countryIso2: "us",
          serviceZoneId: null,
          fulfillmentProviderId: null,
          stockLocationId: null,
          salesChannelId: null,
          shippingProfileId: null,
          shippingOptionId: null,
          priceReady: false,
          rulesReady: false,
          visibleToStoreApiExpected: false,
          created: [],
          existing: [],
          error: serializeProviderLinkRepairError(error),
        },
        null,
        2,
      ),
    );
  }
}
