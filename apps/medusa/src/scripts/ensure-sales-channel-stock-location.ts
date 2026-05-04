import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { createInventoryLevelsWorkflow, linkSalesChannelsToStockLocationWorkflow } from "@medusajs/medusa/core-flows";

type SalesChannelRecord = { id: string; name?: string; is_default?: boolean; stock_locations?: StockLocationRecord[] };
type StockLocationRecord = { id: string; name?: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getInventoryItemIdFromVariant = (variant: unknown): string | null => {
  if (!isRecord(variant)) {
    return null;
  }

  const inventoryItems = variant.inventory_items;
  if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
    return null;
  }

  for (const item of inventoryItems) {
    if (!isRecord(item)) {
      continue;
    }

    const directId = item.id;
    if (typeof directId === "string" && directId.length > 0) {
      return directId;
    }

    const inventoryItemId = item.inventory_item_id;
    if (typeof inventoryItemId === "string" && inventoryItemId.length > 0) {
      return inventoryItemId;
    }

    const nestedInventoryItem = item.inventory_item;
    if (isRecord(nestedInventoryItem) && typeof nestedInventoryItem.id === "string" && nestedInventoryItem.id.length > 0) {
      return nestedInventoryItem.id;
    }

    const nestedInventory = item.inventory;
    if (isRecord(nestedInventory) && typeof nestedInventory.id === "string" && nestedInventory.id.length > 0) {
      return nestedInventory.id;
    }
  }

  return null;
};

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

  const variant = variantRes.data?.[0] || null;
  const variantId = isRecord(variant) && typeof variant.id === "string" ? variant.id : null;
  if (!variantId) blockers.push("variant_missing");

  const inventoryItemId = getInventoryItemIdFromVariant(variant);
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
        variantId,
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
