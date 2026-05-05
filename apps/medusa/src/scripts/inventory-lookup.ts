import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null

const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])


export const VARIANT_INVENTORY_FIELD_ATTEMPTS: string[][] = [["id", "sku", "manage_inventory"]]

export async function queryVariantInventoryShape(query: any, variantId: string = TARGET_VARIANT_ID) {
  const attempts: Array<{ fieldSet: string[]; success: boolean; errorMessage: string | null; sample: unknown }> = []

  for (const fieldSet of VARIANT_INVENTORY_FIELD_ATTEMPTS) {
    try {
      const res = await query.graph({ entity: "product_variant", fields: fieldSet, filters: { id: variantId }, pagination: { take: 1 } })
      attempts.push({ fieldSet, success: true, errorMessage: null, sample: asArray(res?.data)[0] ?? null })
    } catch (e) {
      attempts.push({ fieldSet, success: false, errorMessage: e instanceof Error ? e.message : String(e), sample: null })
    }
  }

  return attempts
}

export async function resolveVariantById(query: any, variantId: string = TARGET_VARIANT_ID) {
  const res = await query.graph({
    entity: "product_variant",
    fields: ["id", "sku", "manage_inventory"],
    filters: { id: variantId },
    pagination: { take: 1 },
  })

  const variant = asArray(res?.data)[0]
  const resolvedVariantId = isRecord(variant) && typeof variant.id === "string" ? variant.id : null
  const sku = isRecord(variant) && typeof variant.sku === "string" ? variant.sku : null

  return { variant, variantId: resolvedVariantId, sku }
}

export async function resolveInventoryItemIdBySku(query: any, sku: string | null) {
  if (!sku) return null

  const res = await query.graph({
    entity: "inventory_item",
    fields: ["id", "sku"],
    filters: { sku },
    pagination: { take: 1 },
  })

  const inventoryItem = asArray(res?.data)[0]
  return isRecord(inventoryItem) && typeof inventoryItem.id === "string" ? inventoryItem.id : null
}

export function getQueryFromContainer(container: any) {
  return container.resolve(ContainerRegistrationKeys.QUERY)
}
