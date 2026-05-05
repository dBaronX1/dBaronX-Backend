import { ExecArgs } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createInventoryItemsWorkflow, createLinksWorkflow } from "@medusajs/medusa/core-flows"

import { getQueryFromContainer, resolveVariantById } from "./inventory-lookup"

const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ"

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null
const asArray = <T = unknown>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

export async function ensureVariantInventoryLink(container: ExecArgs["container"], variantId: string = TARGET_VARIANT_ID) {
  const query = getQueryFromContainer(container)

  const { variant, variantId: resolvedVariantId, sku } = await resolveVariantById(query, variantId)
  if (!resolvedVariantId) {
    return {
      variantId: null,
      sku: null,
      inventoryItemId: null,
      linkReady: false,
      created: [] as string[],
      existing: [] as string[],
      blockers: ["variant_missing"],
    }
  }

  const existingLinks = await query.graph({
    entity: "product_variant_inventory_item",
    fields: ["variant_id", "inventory_item_id", "required_quantity"],
    filters: { variant_id: resolvedVariantId },
    pagination: { take: 20 },
  })

  const links = asArray(existingLinks?.data)
  const firstLink = links.find((l) => isRecord(l) && typeof l.inventory_item_id === "string") as Record<string, unknown> | undefined

  const created: string[] = []
  const existing: string[] = []
  const blockers: string[] = []

  let inventoryItemId: string | null = firstLink && typeof firstLink.inventory_item_id === "string" ? firstLink.inventory_item_id : null

  if (!inventoryItemId) {
    const createdItems = await createInventoryItemsWorkflow(container).run({
      input: {
        items: [
          {
            sku: sku ?? `${resolvedVariantId}-auto`,
            title: `Auto-linked inventory for ${resolvedVariantId}`,
            requires_shipping: true,
          },
        ],
      },
    })

    const createdItem = asArray(createdItems.result)[0]
    inventoryItemId = isRecord(createdItem) && typeof createdItem.id === "string" ? createdItem.id : null

    if (!inventoryItemId) {
      blockers.push("inventory_item_create_failed")
    } else {
      created.push("inventory_item")
      await createLinksWorkflow(container).run({
        input: [
          {
            [Modules.PRODUCT]: { variant_id: resolvedVariantId },
            [Modules.INVENTORY]: { inventory_item_id: inventoryItemId },
            data: { required_quantity: 1 },
          },
        ],
      })
      created.push("variant_inventory_link")
    }
  } else {
    existing.push("variant_inventory_link")
  }

  const linkReady = Boolean(inventoryItemId)
  if (!linkReady) blockers.push("inventory_item_link_missing")

  return {
    variantId: resolvedVariantId,
    sku: isRecord(variant) && typeof variant.sku === "string" ? variant.sku : sku,
    inventoryItemId,
    linkReady,
    created,
    existing,
    blockers,
  }
}


export default async function ensureVariantInventoryLinkScript({ container }: ExecArgs) {
  const result = await ensureVariantInventoryLink(container)
  console.log(JSON.stringify({ success: result.blockers.length === 0, ...result }, null, 2))
}
