import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows";

type SalesChannelRecord = { id: string; name?: string };
type StockLocationRecord = { id: string; name?: string };

export default async function ensureSalesChannelStockLocation({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const blockers: string[] = [];

  const salesChannelsRes = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default", "stock_locations.id"],
    pagination: { take: 50 },
  });

  const salesChannels = (salesChannelsRes.data || []) as (SalesChannelRecord & {
    is_default?: boolean;
    stock_locations?: StockLocationRecord[];
  })[];

  const stockLocationsRes = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { take: 50 },
  });

  const stockLocations = (stockLocationsRes.data || []) as StockLocationRecord[];

  const selectedSalesChannel =
    salesChannels.find((sc) => sc.is_default) ||
    salesChannels.find((sc) => String(sc.name || "").toLowerCase().includes("default")) ||
    salesChannels[0];

  const selectedStockLocation =
    stockLocations.find((sl) => String(sl.name || "").toLowerCase().includes("default")) ||
    stockLocations[0];

  if (!selectedSalesChannel?.id) blockers.push("sales_channel_missing");
  if (!selectedStockLocation?.id) blockers.push("stock_location_missing");

  let created = false;

  if (selectedSalesChannel?.id && selectedStockLocation?.id) {
    const linked = (selectedSalesChannel.stock_locations || []).some(
      (location) => location?.id === selectedStockLocation.id
    );

    if (!linked) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
          id: selectedSalesChannel.id,
          add: [selectedStockLocation.id],
        },
      });
      created = true;
    }
  }

  console.log(
    JSON.stringify(
      {
        success: blockers.length === 0,
        created,
        salesChannelId: selectedSalesChannel?.id ?? null,
        stockLocationId: selectedStockLocation?.id ?? null,
        blockers,
      },
      null,
      2
    )
  );
}
