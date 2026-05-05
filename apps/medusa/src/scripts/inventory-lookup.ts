import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

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
  }

  return null
}

export const VARIANT_INVENTORY_FIELD_ATTEMPTS: string[][] = [
  ["id", "title", "sku"],
  ["id", "inventory_items"],
  ["id", "inventory_items.*"],
  ["id", "inventory_items.id", "inventory_items.inventory_item_id"],
]

export async function queryVariantInventoryShape(query: any, variantId: string = TARGET_VARIANT_ID) {
  const attempts: Array<{ fieldSet: string[]; success: boolean; errorMessage: string | null; sample: unknown }> = []

  for (const fieldSet of VARIANT_INVENTORY_FIELD_ATTEMPTS) {
    try {
      const res = await query.graph({
        entity: "product_variant",
        fields: fieldSet,
        filters: { id: variantId },
        pagination: { take: 1 },
      })
      const variant = asArray(res?.data)[0]
      attempts.push({ fieldSet, success: true, errorMessage: null, sample: variant ?? null })
    } catch (e) {
      attempts.push({
        fieldSet,
        success: false,
        errorMessage: e instanceof Error ? e.message : String(e),
        sample: null,
      })
    }
  }

  return attempts
}

export async function resolveInventoryItemIdFromVariant(query: any, variantId: string = TARGET_VARIANT_ID) {
  const attempts = await queryVariantInventoryShape(query, variantId)
  const firstSuccessfulSample = attempts.find((x) => x.success && x.sample)

  const variant = firstSuccessfulSample?.sample
  const inventoryItemId = getInventoryItemIdFromVariant(variant)

  if (!firstSuccessfulSample) {
    return { variant: null, variantId: null, inventoryItemId: null, attempts }
  }

  const resolvedVariantId = isRecord(variant) && typeof variant.id === "string" ? variant.id : null
  return { variant, variantId: resolvedVariantId, inventoryItemId, attempts }
}

export function getQueryFromContainer(container: any) {
  return container.resolve(ContainerRegistrationKeys.QUERY)
}
