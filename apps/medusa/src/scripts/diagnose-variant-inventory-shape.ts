import { ExecArgs } from "@medusajs/framework/types"
import { getQueryFromContainer, queryVariantInventoryShape } from "./inventory-lookup"

const TARGET_VARIANT_ID = "variant_01KQR5QC1GWD6Z6Q4S9EY358JQ"

export default async function diagnoseVariantInventoryShape({ container }: ExecArgs) {
  const query = getQueryFromContainer(container)
  const attempts = await queryVariantInventoryShape(query, TARGET_VARIANT_ID)
  console.log(JSON.stringify({ variantId: TARGET_VARIANT_ID, attempts }, null, 2))
}
