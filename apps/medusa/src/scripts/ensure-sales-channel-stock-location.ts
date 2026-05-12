import { ExecArgs } from "@medusajs/framework/types";

import { ensureLaunchSalesChannelConsistency } from "./ensure-launch-sales-channel-consistency";

export default async function ensureSalesChannelStockLocation({ container }: ExecArgs) {
  const result = await ensureLaunchSalesChannelConsistency(container);
  console.log(
    JSON.stringify(
      {
        success: result.success,
        blockers: result.blockers,
        salesChannelId: result.canonicalSalesChannelId,
        stockLocationId: result.stockLocationId,
        salesChannelStockLocationLinked: result.stockLocationLinked,
        stockLocationSalesChannelIds: result.stockLocationSalesChannelIds,
        repaired: result.repaired,
        nextManualStep: result.nextManualStep,
      },
      null,
      2,
    ),
  );
}
