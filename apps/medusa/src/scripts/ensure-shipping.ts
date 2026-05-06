import { ExecArgs } from "@medusajs/framework/types";

import { ensureShippingReadiness } from "./shipping-readiness";

export default async function ensureShipping({ container }: ExecArgs) {
  const readiness = await ensureShippingReadiness(container, { repair: true });

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
        fulfillmentProviderReady: readiness.fulfillmentProviderReady,
        fulfillmentProviderId: readiness.fulfillmentProviderId,
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
        ...(readiness.providerLinkRepairError
          ? { providerLinkRepairError: readiness.providerLinkRepairError }
          : {}),
      },
      null,
      2,
    ),
  );
}
