import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows"

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H"
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const getInventoryItemIdFromVariant = (value: unknown): string | null => {
  if (!isRecord(value)) return null

  const inventoryItems = asArray(value.inventory_items)
  for (const item of inventoryItems) {
    if (!isRecord(item)) continue

    if (typeof item.id === "string" && item.id.length > 0) return item.id
    if (typeof item.inventory_item_id === "string" && item.inventory_item_id.length > 0) return item.inventory_item_id

    const inventoryItem = item.inventory_item
    if (isRecord(inventoryItem) && typeof inventoryItem.id === "string" && inventoryItem.id.length > 0) return inventoryItem.id

    const inventory = item.inventory
    if (isRecord(inventory) && typeof inventory.id === "string" && inventory.id.length > 0) return inventory.id
  }

  return null
}

export default async function ensureSalesChannelStockLocation({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const created: string[] = []
  const existing: string[] = []
  const blockers: string[] = []

  const salesChannelRes = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default", "stock_locations.id"],
    filters: { id: TARGET_SALES_CHANNEL_ID },
    pagination: { take: 1 },
  })
  const salesChannel = asArray(salesChannelRes.data)[0]
  const salesChannelId = isRecord(salesChannel) && typeof salesChannel.id === "string" ? salesChannel.id : null
  if (!salesChannelId) blockers.push("sales_channel_missing")

  const variantRes = await query.graph({
    entity: "product_variant",
    fields: ["id", "inventory_items.id", "inventory_items.inventory_item_id", "inventory_items.inventory_item.id", "inventory_items.inventory.id"],
    filters: { id: TARGET_VARIANT_ID },
    pagination: { take: 1 },
  })
  const variant = asArray(variantRes.data)[0]
  const variantId = isRecord(variant) && typeof variant.id === "string" ? variant.id : null
  if (!variantId) blockers.push("variant_missing")

  const inventoryItemId = getInventoryItemIdFromVariant(variant)
  if (!inventoryItemId) blockers.push("inventory_item_missing")

  const stockLocationRes = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
    pagination: { take: 100 },
  })
  const stockLocations = asArray(stockLocationRes.data)
  const selectedStockLocation = stockLocations.find((loc) => isRecord(loc) && typeof loc.id === "string")
  const stockLocationId = isRecord(selectedStockLocation) && typeof selectedStockLocation.id === "string" ? selectedStockLocation.id : null
  if (!stockLocationId) blockers.push("stock_location_missing")

  let salesChannelStockLocationLinked = false
  if (salesChannelId && stockLocationId) {
    const linked = asArray(isRecord(salesChannel) ? salesChannel.stock_locations : undefined).some(
      (loc) => isRecord(loc) && loc.id === stockLocationId
    )

    if (linked) {
      existing.push("sales_channel_stock_location_link")
      salesChannelStockLocationLinked = true
    } else {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: salesChannelId, add: [stockLocationId] },
      })
      created.push("sales_channel_stock_location_link")
      salesChannelStockLocationLinked = true
    }
  }

  let inventoryLevelReady = false
  if (inventoryItemId && stockLocationId) {
    const inventoryLevelRes = await query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
      filters: { inventory_item_id: inventoryItemId, location_id: stockLocationId },
      pagination: { take: 1 },
    })

    const existingLevel = asArray(inventoryLevelRes.data)[0]
    if (isRecord(existingLevel) && typeof existingLevel.id === "string") {
      existing.push("inventory_level")
      inventoryLevelReady = true
    } else {
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: [
            {
              inventory_item_id: inventoryItemId,
              location_id: stockLocationId,
              stocked_quantity: 100,
            },
          ],
        },
      })
      created.push("inventory_level")
      inventoryLevelReady = true
    }
  }

  if (!salesChannelStockLocationLinked) blockers.push("sales_channel_stock_location_link_missing")
  if (!inventoryLevelReady) blockers.push("inventory_level_missing")

  console.log(
    JSON.stringify(
      {
        success: blockers.length === 0,
        created,
        existing,
        blockers,
        salesChannelId,
        stockLocationId,
        variantId,
        inventoryItemId,
        inventoryLevelReady,
        salesChannelStockLocationLinked,
      },
      null,
      2
    )
  )
}
