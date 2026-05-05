import { ExecArgs } from "@medusajs/framework/types"
import {
  createInventoryLevelsWorkflow,
  createRegionsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

import { getQueryFromContainer } from "./inventory-lookup"
import { ensureVariantInventoryLink } from "./ensure-variant-inventory-link"

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H"
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ"
const TARGET_STOCK_LOCATION_ID = "sloc_01KQR5J1PYD7FZ1AF516W1VQWJ"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export default async function ensureCommercePrerequisites({ container }: ExecArgs) {
  const query = getQueryFromContainer(container)

  const created: string[] = []
  const existing: string[] = []
  const blockers: string[] = []

  const regionsRes = await query.graph({ entity: "region", fields: ["id", "name", "currency_code"], pagination: { take: 50 } })
  let region = asArray(regionsRes.data).find((r) => isRecord(r) && String(r.currency_code || "").toLowerCase() === "usd")
  if (!isRecord(region) || typeof region.id !== "string") {
    const createdRegion = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          { name: "dBaronX Launch Region", currency_code: "usd", countries: ["us"], payment_providers: ["pp_system_default"] },
        ],
      },
    })
    region = asArray(createdRegion.result)[0]
    if (isRecord(region) && typeof region.id === "string") created.push("region")
  } else existing.push("region")

  const regionId = isRecord(region) && typeof region.id === "string" ? region.id : null
  if (regionId) {
    await updateStoresWorkflow(container).run({
      input: { selector: {}, update: { default_region_id: regionId, supported_currencies: [{ currency_code: "usd", is_default: true }] } },
    })
  } else {
    blockers.push("region_missing")
  }

  const stockLocationId = TARGET_STOCK_LOCATION_ID
  const stockLocationRes = await query.graph({ entity: "stock_location", fields: ["id", "name"], filters: { id: stockLocationId }, pagination: { take: 1 } })
  const stockLocation = asArray(stockLocationRes.data)[0]
  if (isRecord(stockLocation) && typeof stockLocation.id === "string") existing.push("stock_location")
  else blockers.push("stock_location_missing")

  const profilesRes = await query.graph({ entity: "shipping_profile", fields: ["id", "name", "type"], pagination: { take: 20 } })
  let shippingProfile = asArray(profilesRes.data).find((p) => isRecord(p) && p.type === "default")
  if (!isRecord(shippingProfile) || typeof shippingProfile.id !== "string") {
    const createdProfiles = await createShippingProfilesWorkflow(container).run({
      input: { data: [{ name: "Default Shipping Profile", type: "default" }] },
    })
    shippingProfile = asArray(createdProfiles.result)[0]
    if (isRecord(shippingProfile) && typeof shippingProfile.id === "string") created.push("shipping_profile")
  } else existing.push("shipping_profile")

  const shippingOptionsRes = await query.graph({ entity: "shipping_option", fields: ["id", "name"], pagination: { take: 20 } })
  const shippingOption = asArray(shippingOptionsRes.data)[0]
  const shippingOptionId = isRecord(shippingOption) && typeof shippingOption.id === "string" ? shippingOption.id : null
  if (shippingOptionId) existing.push("shipping_option")
  else blockers.push("shipping_option_missing")

  const productsRes = await query.graph({
    entity: "product",
    fields: ["id", "metadata", "variants.id", "variants.metadata", "variants.prices.id", "variants.prices.amount", "variants.prices.currency_code", "variants.inventory_quantity", "variants.manage_inventory"],
    pagination: { take: 200 },
  })
  const products = asArray(productsRes.data)
  const variants = products.flatMap((p) => (isRecord(p) ? asArray(p.variants) : []))
  const productCount = products.length
  const variantCount = variants.length

  const priceReady = variants.every((v) =>
    asArray(isRecord(v) ? v.prices : undefined).some((price) => isRecord(price) && Number(price.amount || 0) > 0 && String(price.currency_code || "").toLowerCase() === "usd")
  )
  const stockReady = variants.some((v) => {
    if (!isRecord(v)) return false
    const managed = Boolean(v.manage_inventory)
    return managed ? Number(v.inventory_quantity ?? 0) > 0 : true
  })
  const supplierMetadataReady = products.every((p) => {
    if (!isRecord(p)) return false
    const meta = isRecord(p.metadata) ? p.metadata : {}
    const pSupplier = Boolean(meta.supplierRef || meta.supplier || meta.supplier_ref)
    const vSupplier = asArray(p.variants).some((v) => {
      if (!isRecord(v)) return false
      const vMeta = isRecord(v.metadata) ? v.metadata : {}
      return Boolean(vMeta.supplierRef || vMeta.supplier || vMeta.supplier_ref)
    })
    return pSupplier || vSupplier
  })

  if (productCount === 0) blockers.push("products_missing")
  if (variantCount === 0) blockers.push("variants_missing")
  if (!priceReady) blockers.push("price_pending")
  if (!stockReady) blockers.push("out_of_stock")
  if (!supplierMetadataReady) blockers.push("supplier_na")

  const salesChannelRes = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default", "stock_locations.id"],
    filters: { id: TARGET_SALES_CHANNEL_ID },
    pagination: { take: 1 },
  })
  const salesChannel = asArray(salesChannelRes.data)[0]
  const salesChannelId = isRecord(salesChannel) && typeof salesChannel.id === "string" ? salesChannel.id : null
  if (!salesChannelId) blockers.push("sales_channel_missing")

  const variantLink = await ensureVariantInventoryLink(container, TARGET_VARIANT_ID)
  const variantId = variantLink.variantId
  const inventoryItemId = variantLink.inventoryItemId
  created.push(...variantLink.created)
  existing.push(...variantLink.existing)
  blockers.push(...variantLink.blockers)

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
    const levelRes = await query.graph({
      entity: "inventory_level",
      fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
      filters: { inventory_item_id: inventoryItemId, location_id: stockLocationId },
      pagination: { take: 1 },
    })
    const level = asArray(levelRes.data)[0]
    if (isRecord(level) && typeof level.id === "string") {
      existing.push("inventory_level")
      inventoryLevelReady = true
    } else {
      await createInventoryLevelsWorkflow(container).run({
        input: {
          inventory_levels: [{ inventory_item_id: inventoryItemId, location_id: stockLocationId, stocked_quantity: 100 }],
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
        regionId,
        shippingOptionId,
        productCount,
        variantCount,
        priceReady,
        stockReady,
        supplierMetadataReady,
      },
      null,
      2
    )
  )
}
