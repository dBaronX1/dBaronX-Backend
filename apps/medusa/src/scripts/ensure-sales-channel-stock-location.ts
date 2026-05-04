import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createInventoryLevelsWorkflow, linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows";

type SalesChannelRecord = { id: string; name?: string; is_default?: boolean; stock_locations?: StockLocationRecord[] };
type StockLocationRecord = { id: string; name?: string };
type ProductVariantRecord = { id: string; inventory_items?: { id: string }[] };

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H";
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ";

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H";
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ";

export default async function ensureSalesChannelStockLocation({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const blockers: string[] = [];

  const salesChannelsRes = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default", "stock_locations.id"],
    pagination: { take: 100 },
  });

  const salesChannels = (salesChannelsRes.data || []) as SalesChannelRecord[];
  const selectedSalesChannel = salesChannels.find((sc) => sc.id === TARGET_SALES_CHANNEL_ID);

  if (!selectedSalesChannel?.id) blockers.push("sales_channel_missing");

  const stockLocationsRes = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { take: 100 },
  });

  const stockLocations = (stockLocationsRes.data || []) as StockLocationRecord[];

  const variantRes = await query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.id"],
    filters: { id: TARGET_VARIANT_ID },
    pagination: { take: 1 },
  });

  const variant = (variantRes.data?.[0] || null) as ProductVariantRecord | null;
  if (!variant?.id) blockers.push("variant_missing");

  const inventoryItemId = variant?.inventory_items?.[0]?.id || null;
  if (!inventoryItemId) blockers.push("inventory_item_missing");

  const inventoryLevelsRes = inventoryItemId
    ? await query.graph({
        entity: "inventory_level",
        fields: ["id", "stocked_quantity", "location_id", "inventory_item_id"],
        filters: { inventory_item_id: inventoryItemId },
        pagination: { take: 100 },
      })
    : { data: [] as any[] };

  const inventoryLevels = (inventoryLevelsRes.data || []) as Array<{ location_id?: string }>;

  let selectedStockLocation = stockLocations.find((sl) =>
    inventoryLevels.some((level) => level?.location_id === sl.id)
  );

  if (!selectedStockLocation?.id) {
    selectedStockLocation =
      stockLocations.find((sl) => String(sl.name || "").toLowerCase().includes("default")) || stockLocations[0];
  }

  if (!selectedStockLocation?.id) blockers.push("stock_location_missing");

  let salesChannelStockLocationLinked = false;
  if (selectedSalesChannel?.id && selectedStockLocation?.id) {
    salesChannelStockLocationLinked = (selectedSalesChannel.stock_locations || []).some(
      (location) => location?.id === selectedStockLocation?.id
    );

    if (!salesChannelStockLocationLinked) {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: {
          id: selectedSalesChannel.id,
          add: [selectedStockLocation.id],
        },
      });
      salesChannelStockLocationLinked = true;
    }
  }

  let inventoryLevelReady = false;
  if (inventoryItemId && selectedStockLocation?.id) {
    const levelExistsAtLocation = inventoryLevels.some((level) => level?.location_id === selectedStockLocation?.id);

    if (!levelExistsAtLocation) {
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: [
            {
              inventory_item_id: inventoryItemId,
              location_id: selectedStockLocation.id,
              stocked_quantity: 100,
            },
          ],
        },
      });
      inventoryLevelReady = true;
    } else {
      inventoryLevelReady = true;
    }
  }

  if (!salesChannelStockLocationLinked) blockers.push("sales_channel_stock_location_link_missing");
  if (!inventoryLevelReady) blockers.push("inventory_level_missing");

  console.log(
    JSON.stringify(
      {
        success: blockers.length === 0,
        salesChannelId: selectedSalesChannel?.id ?? null,
        stockLocationId: selectedStockLocation?.id ?? null,
        variantId: variant?.id ?? null,
        inventoryItemId,
        inventoryLevelReady,
        salesChannelStockLocationLinked,
        blockers,
      },
      null,
      2
    )
  );
}
