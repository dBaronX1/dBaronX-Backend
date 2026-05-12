import { ExecArgs } from "@medusajs/framework/types";

import { ensurePublishableApiKey } from "./ensure-publishable-api-key";
import { ensureLaunchSalesChannelConsistency } from "./ensure-launch-sales-channel-consistency";
import {
  ensureShippingReadiness,
  isRedisUnavailableOrQuotaError,
  REDIS_UNAVAILABLE_BLOCKER,
  serializeProviderLinkRepairError,
} from "./shipping-readiness";

export default async function ensureFreshDbLaunchCommerce({ container }: ExecArgs) {
  try {
    const shipping = await ensureShippingReadiness(container, { repair: true });
    const key = await ensurePublishableApiKey(container);
    const consistency = await ensureLaunchSalesChannelConsistency(container);
    const blockers = Array.from(new Set([...shipping.blockers, ...key.blockers, ...consistency.blockers]));

    console.log(
      JSON.stringify(
        {
          success: blockers.length === 0,
          created: Array.from(new Set([...shipping.created, ...key.created])),
          existing: Array.from(new Set([...shipping.existing, ...key.existing])),
          blockers,
          regionId: shipping.regionId,
          salesChannelId: consistency.canonicalSalesChannelId || shipping.salesChannelId || key.salesChannelId,
          canonicalSalesChannelId: consistency.canonicalSalesChannelId,
          publishableApiKeyId: key.publishableApiKeyId,
          publishableApiKeyTokenPreview: key.publishableApiKeyTokenPreview,
          publishableApiKeyCreated: key.publishableApiKeyCreated,
          publishableApiKeyLinkedToSalesChannel: consistency.publishableKeyLinked || key.linked,
          storeDefaultSalesChannelId: consistency.storeDefaultSalesChannelId,
          productLinkedToCanonicalSalesChannel: consistency.productLinked,
          stockLocationLinkedToCanonicalSalesChannel: consistency.stockLocationLinked,
          shippingProfileId: shipping.shippingProfileId,
          stockLocationId: shipping.stockLocationId,
          fulfillmentSetId: shipping.fulfillmentSetId,
          serviceZoneId: shipping.serviceZoneId,
          fulfillmentProviderId: shipping.fulfillmentProviderId,
          shippingOptionId: shipping.shippingOptionId,
          shippingOptionReady: shipping.shippingOptionReady,
          storeShippingOptionReady: shipping.visibleToStoreApiExpected,
          storeApiVisibilityProofReady: consistency.shippingOptionVisibleForCanonicalCart || shipping.storeApiVisibilityProofReady,
          storeProductsAccessible: key.storeProductsAccessible,
          storeRegionsAccessible: key.storeRegionsAccessible,
          nextManualStep:
            blockers.length === 0
              ? "Run DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print, then update MEDUSA_PUBLISHABLE_KEY/NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY/PUBLIC_MEDUSA_PUBLISHABLE_KEY before customer checkout."
              : key.nextManualStep,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    const blockers = isRedisUnavailableOrQuotaError(error)
      ? [REDIS_UNAVAILABLE_BLOCKER]
      : [`launch_commerce_ensure_failed:${String(serializeProviderLinkRepairError(error).message)}`];
    console.log(
      JSON.stringify(
        {
          success: false,
          created: [],
          existing: [],
          blockers,
          regionId: null,
          salesChannelId: null,
          publishableApiKeyId: null,
          publishableApiKeyTokenPreview: null,
          publishableApiKeyCreated: false,
          publishableApiKeyLinkedToSalesChannel: false,
          shippingProfileId: null,
          stockLocationId: null,
          fulfillmentSetId: null,
          serviceZoneId: null,
          fulfillmentProviderId: null,
          shippingOptionId: null,
          shippingOptionReady: false,
          storeShippingOptionReady: false,
          storeApiVisibilityProofReady: false,
          nextManualStep: "Fix the reported blocker, rerun db:prepare, then rerun launch-commerce:ensure before seeding or checkout.",
        },
        null,
        2,
      ),
    );
  }
}
