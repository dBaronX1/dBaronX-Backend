import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { linkSalesChannelsToStockLocationWorkflow, updateInventoryLevelsWorkflow } from "@medusajs/medusa/core-flows";

type SalesChannelRecord = { id: string; name?: string };
type StockLocationRecord = { id: string; name?: string };

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H";
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ";

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
    salesChannels.find((sc) => sc.id === TARGET_SALES_CHANNEL_ID) ||
    salesChannels.find((sc) => sc.is_default) ||
    salesChannels.find((sc) => String(sc.name || "").toLowerCase().includes("default")) ||
    salesChannels[0];

  const selectedStockLocation =
    stockLocations.find((sl) => String(sl.name || "").toLowerCase().includes("default")) ||
    stockLocations[0];

  if (!selectedSalesChannel?.id) blockers.push("sales_channel_missing");
  if (selectedSalesChannel?.id !== TARGET_SALES_CHANNEL_ID) blockers.push("sales_channel_mismatch");
  if (!selectedStockLocation?.id) blockers.push("stock_location_missing");

  let salesChannelStockLocationLinked = false;
  let inventoryLevelReady = false;
  let inventoryItemId: string | null = null;

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
      salesChannelStockLocationLinked = true;
    } else {
      salesChannelStockLocationLinked = true;
    }
  }

  const variantRes = await query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.id"],
    filters: { id: TARGET_VARIANT_ID },
    pagination: { take: 1 },
  });
  const variant = (variantRes.data || [])[0] as { id: string; inventory_items?: { id: string }[] } | undefined;
  inventoryItemId = variant?.inventory_items?.[0]?.id ?? null;
  if (!variant?.id) blockers.push("variant_missing");
  if (!inventoryItemId) blockers.push("inventory_item_missing");

  if (inventoryItemId && selectedStockLocation?.id) {
    const inventoryLevelRes = await query.graph({
      entity: "inventory_level",
      fields: ["id", "stock_location_id", "inventory_item_id", "stocked_quantity"],
      filters: { inventory_item_id: inventoryItemId, stock_location_id: selectedStockLocation.id },
      pagination: { take: 5 },
    });
    const inventoryLevel = (inventoryLevelRes.data || [])[0] as { id: string; stocked_quantity?: number } | undefined;

    if (!inventoryLevel?.id) {
      await updateInventoryLevelsWorkflow(container).run({
        input: [
          {
            inventory_item_id: inventoryItemId,
            location_id: selectedStockLocation.id,
            stocked_quantity: 100,
          },
        ],
      });
    }

    const verifyLevelRes = await query.graph({
      entity: "inventory_level",
      fields: ["id"],
      filters: { inventory_item_id: inventoryItemId, stock_location_id: selectedStockLocation.id },
      pagination: { take: 1 },
    });
    inventoryLevelReady = Boolean((verifyLevelRes.data || [])[0]?.id);
    if (!inventoryLevelReady) blockers.push("inventory_level_missing");
  }

  console.log(
    JSON.stringify(
      {
        success: blockers.length === 0,
        salesChannelId: selectedSalesChannel?.id ?? null,
        stockLocationId: selectedStockLocation?.id ?? null,
        variantId: TARGET_VARIANT_ID,
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
