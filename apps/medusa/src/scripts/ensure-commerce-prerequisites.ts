import { ExecArgs } from "@medusajs/framework/types"
import {
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

import { getQueryFromContainer } from "./inventory-lookup"
import { ensureVariantInventoryLink } from "./ensure-variant-inventory-link"
import { ensureShippingReadiness, TARGET_STOCK_LOCATION_ID } from "./shipping-readiness"

const TARGET_SALES_CHANNEL_ID = "sc_01KQNM6EQZ19Y1BCSRVF9XV61H"
const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ"
const TARGET_INVENTORY_ITEM_ID = "iitem_01KQR5QC2583QHSFDYDWE942Y7"
const TARGET_REGION_ID = "reg_01KQSEKK6A9T86NJ0AG05XPK3H"
const DEFAULT_SHIPPING_OPTION_NAME = "dBaronX Standard Delivery"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const pushUnique = (values: string[], value: string) => {
  if (!values.includes(value)) values.push(value)
}

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
  if (isRecord(stockLocation) && typeof stockLocation.id === "string") pushUnique(existing, "stock_location")
  else pushUnique(blockers, "stock_location_missing")

  const shippingReadiness = await ensureShippingReadiness(container, { repair: true })
  for (const item of shippingReadiness.created) pushUnique(created, item)
  for (const item of shippingReadiness.existing) pushUnique(existing, item)
  for (const blocker of shippingReadiness.blockers) pushUnique(blockers, blocker)

  const shippingOptionsRes = await query.graph({ entity: "shipping_option", fields: ["id", "name"], pagination: { take: 20 } })
  let shippingOption = asArray(shippingOptionsRes.data).find((option) => isRecord(option) && option.name === DEFAULT_SHIPPING_OPTION_NAME)
  const fulfillmentProvidersRes = await query.graph({ entity: "fulfillment_provider", fields: ["id"], pagination: { take: 20 } })
  const fulfillmentProviders = asArray(fulfillmentProvidersRes.data)
  const serviceZonesRes = await query.graph({ entity: "service_zone", fields: ["id", "name"], pagination: { take: 20 } })
  const serviceZones = asArray(serviceZonesRes.data)
  if ((!isRecord(shippingOption) || typeof shippingOption.id !== "string") && regionId && isRecord(shippingProfile) && typeof shippingProfile.id === "string" && serviceZones.length > 0 && fulfillmentProviders.length > 0) {
    const createdShippingOptions = await createShippingOptionsWorkflow(container).run({
      input: {
        data: [{
          name: DEFAULT_SHIPPING_OPTION_NAME,
          service_zone_id: String((serviceZones[0] as Record<string, unknown>).id || ""),
          shipping_profile_id: shippingProfile.id,
          provider_id: String((fulfillmentProviders[0] as Record<string, unknown>).id || ""),
          type: { label: "Standard", description: "Flat rate shipping" },
          price_type: "flat",
          prices: [{ currency_code: "usd", amount: 0 }],
          rules: [{ operator: "eq", attribute: "region_id", value: regionId }],
        }],
      },
    })
    shippingOption = asArray(createdShippingOptions.result)[0]
    if (isRecord(shippingOption) && typeof shippingOption.id === "string") created.push("shipping_option")
  }
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
  let inventoryLevelReady = false
  let stockReady = false
  const stockInventoryItemId = TARGET_INVENTORY_ITEM_ID
  const stockLevelRes = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id", "stocked_quantity"],
    filters: { inventory_item_id: stockInventoryItemId, location_id: stockLocationId },
    pagination: { take: 1 },
  })
  const stockLevel = asArray(stockLevelRes.data)[0]
  if (isRecord(stockLevel) && typeof stockLevel.id === "string") {
    inventoryLevelReady = true
    const stockedQuantity = Number(stockLevel.stocked_quantity ?? 0)
    stockReady = stockedQuantity > 0
    pushUnique(existing, "inventory_level")
  }
  if (!stockReady) {
    const targetVariant = variants.find((v) => isRecord(v) && v.id === TARGET_VARIANT_ID)
    if (isRecord(targetVariant)) {
      const quantity = Number(targetVariant.inventory_quantity ?? 0)
      const managed = Boolean(targetVariant.manage_inventory)
      if (!managed || quantity > 0) stockReady = true
    }
  }
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

  if (productCount === 0) pushUnique(blockers, "products_missing")
  if (variantCount === 0) pushUnique(blockers, "variants_missing")
  if (!priceReady) pushUnique(blockers, "price_pending")
  if (!stockReady) pushUnique(blockers, "out_of_stock")
  if (!supplierMetadataReady) pushUnique(blockers, "supplier_na")

  const salesChannelRes = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name", "is_default", "stock_locations.id"],
    filters: { id: TARGET_SALES_CHANNEL_ID },
    pagination: { take: 1 },
  })
  const salesChannel = asArray(salesChannelRes.data)[0]
  const salesChannelId = isRecord(salesChannel) && typeof salesChannel.id === "string" ? salesChannel.id : null
  if (!salesChannelId) pushUnique(blockers, "sales_channel_missing")

  const variantLink = await ensureVariantInventoryLink(container, TARGET_VARIANT_ID)
  const variantId = variantLink.variantId
  const inventoryItemId = variantLink.inventoryItemId
  for (const item of variantLink.created) pushUnique(created, item)
  for (const item of variantLink.existing) pushUnique(existing, item)
  for (const blocker of variantLink.blockers) pushUnique(blockers, blocker)

  let salesChannelStockLocationLinked = false
  if (salesChannelId && stockLocationId) {
    const linked = asArray(isRecord(salesChannel) ? salesChannel.stock_locations : undefined).some(
      (loc) => isRecord(loc) && loc.id === stockLocationId
    )
    if (linked) {
      pushUnique(existing, "sales_channel_stock_location_link")
      salesChannelStockLocationLinked = true
    } else {
      await linkSalesChannelsToStockLocationWorkflow(container).run({
        input: { id: salesChannelId, add: [stockLocationId] },
      })
      pushUnique(created, "sales_channel_stock_location_link")
      salesChannelStockLocationLinked = true
    }
  }

  if (!salesChannelStockLocationLinked) pushUnique(blockers, "sales_channel_stock_location_link_missing")
  if (!inventoryLevelReady) pushUnique(blockers, "inventory_level_missing")

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
        targetRegionId: TARGET_REGION_ID,
        shippingOptionId,
        shippingOptionReady,
        serviceZoneId,
        serviceZoneReady,
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
