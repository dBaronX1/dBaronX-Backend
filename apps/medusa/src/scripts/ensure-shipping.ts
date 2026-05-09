import { ExecArgs } from "@medusajs/framework/types";

import {
  ensureShippingReadiness,
  isRedisUnavailableOrQuotaError,
  REDIS_UNAVAILABLE_BLOCKER,
  serializeProviderLinkRepairError,
  TARGET_SALES_CHANNEL_ID,
} from "./shipping-readiness";

export default async function ensureShipping({ container }: ExecArgs) {
  try {
    const readiness = await ensureShippingReadiness(container, {
      repair: true,
    });

    console.log(
      JSON.stringify(
        {
          success: readiness.blockers.length === 0,
          created: readiness.created,
          existing: readiness.existing,
          blockers: readiness.blockers,
          regionId: readiness.regionId,
          shippingProfileId: readiness.shippingProfileId,
          shippingOptionId: readiness.shippingOptionId,
          priceReady: readiness.priceReady,
          rulesReady: readiness.rulesReady,
          visibleToStoreApiExpected: readiness.visibleToStoreApiExpected,
          storeApiVisibilityProofReady: readiness.storeApiVisibilityProofReady,
          storeApiVisibilityProofReason:
            readiness.storeApiVisibilityProofReason,
          salesChannelId: TARGET_SALES_CHANNEL_ID,
          stockLocationId: readiness.stockLocationId,
          fulfillmentSetIdsFromStockLocation:
            readiness.fulfillmentSetIdsFromStockLocation,
          salesChannelStockLocationLinked:
            readiness.salesChannelStockLocationLinked,
          salesChannelFulfillmentSetIds:
            readiness.salesChannelFulfillmentSetIds,
          fulfillmentSetReachableFromSalesChannel:
            readiness.fulfillmentSetReachableFromSalesChannel,
          shippingOptionIdsVisibleToStoreContext:
            readiness.shippingOptionIdsVisibleToStoreContext,
          duplicateShippingOptionIds: readiness.duplicateShippingOptionIds,
          fulfillmentProviderReady: readiness.fulfillmentProviderReady,
          fulfillmentProviderId: readiness.fulfillmentProviderId,
          selectedFulfillmentProviderId:
            readiness.selectedFulfillmentProviderId,
          selectedFulfillmentProviderSource:
            readiness.selectedFulfillmentProviderSource,
          serviceZoneReady: readiness.serviceZoneReady,
          serviceZoneId: readiness.serviceZoneId,
          providerEnabledForServiceLocation:
            readiness.providerEnabledForServiceLocation,
          stockLocationProviderIds: readiness.stockLocationProviderIds,
          serviceZoneProviderIds: readiness.serviceZoneProviderIds,
          attemptedProviderLink: readiness.attemptedProviderLink,
          providerLinkCreated: readiness.providerLinkCreated,
          providerLinkVerifiedAfterRefetch:
            readiness.providerLinkVerifiedAfterRefetch,
          providerLinkWorkflowUsed: readiness.providerLinkWorkflowUsed,
          providerLinkInputPreview: readiness.providerLinkInputPreview,
          ...(readiness.providerLinkRepairError
            ? { providerLinkRepairError: readiness.providerLinkRepairError }
            : {}),
          allFulfillmentProviderIds: readiness.allFulfillmentProviderIds,
          allFulfillmentProviderRecords:
            readiness.allFulfillmentProviderRecords,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const blockers = isRedisUnavailableOrQuotaError(error)
      ? [REDIS_UNAVAILABLE_BLOCKER]
      : [
          `shipping_ensure_failed:${String(
            serializeProviderLinkRepairError(error).message,
          )}`,
        ];

    console.log(
      JSON.stringify(
        {
          success: false,
          created: [],
          existing: [],
          blockers,
          regionId: null,
          shippingProfileId: null,
          shippingOptionId: null,
          fulfillmentProviderReady: false,
          fulfillmentProviderId: null,
          selectedFulfillmentProviderId: null,
          selectedFulfillmentProviderSource: null,
          serviceZoneReady: false,
          serviceZoneId: null,
          providerEnabledForServiceLocation: false,
          storeApiVisibilityProofReady: false,
          storeApiVisibilityProofReason: null,
          salesChannelId: TARGET_SALES_CHANNEL_ID,
          stockLocationId: null,
          fulfillmentSetIdsFromStockLocation: [],
          salesChannelStockLocationLinked: false,
          salesChannelFulfillmentSetIds: [],
          fulfillmentSetReachableFromSalesChannel: false,
          stockLocationProviderIds: [],
          serviceZoneProviderIds: [],
          attemptedProviderLink: false,
          providerLinkCreated: false,
          providerLinkVerifiedAfterRefetch: false,
          providerLinkWorkflowUsed: null,
          providerLinkInputPreview: null,
          providerLinkRepairError: serializeProviderLinkRepairError(error),
          allFulfillmentProviderIds: [],
          allFulfillmentProviderRecords: [],
          note: "If Medusa boot fails before this script runs, Redis must be fixed at the environment/infrastructure level.",
        },
        null,
        2,
      ),
    );
  }
}
