import type { ExecArgs } from "@medusajs/framework/types"
import { controlledCjProducts, controlledProductBlockers, complianceReviewRequired } from "./controlled-cj-products"

export default async function seedControlledCjProducts(_args: ExecArgs) {
  const mode = process.env.DBX_CONTROLLED_CJ_PRODUCTS_MODE || "draft"
  if (mode !== "draft" && mode !== "publish") {
    console.error(JSON.stringify({ success: false, blockers: ["DBX_CONTROLLED_CJ_PRODUCTS_MODE_must_be_draft_or_publish"] }, null, 2))
    process.exit(1)
  }

  const products = controlledCjProducts.map((product) => {
    const blockers = controlledProductBlockers(product)
    const publishReady = blockers.length === 0 && product.verificationStatus === "verified_for_checkout"
    return {
      ...product,
      blockers,
      publishReady,
      realSupplierProduct: mode === "publish" && publishReady,
      complianceReviewRequired: complianceReviewRequired(product),
      telegramCustomerVisible: mode === "publish" && publishReady,
    }
  })

  const publishBlockers = products.filter((product) => !product.publishReady).map((product) => ({ handle: product.handle, blockers: product.blockers }))
  const result = {
    success: mode === "draft" || publishBlockers.length === 0,
    mode,
    totalControlledProducts: products.length,
    draftProducts: products.filter((product) => !product.publishReady).length,
    publishReadyProducts: products.filter((product) => product.publishReady).length,
    verifiedProducts: products.filter((product) => product.verificationStatus === "verified_for_checkout").length,
    complianceReviewRequiredProducts: products.filter((product) => product.complianceReviewRequired).map((product) => product.handle),
    missingSourceUrlProducts: products.filter((product) => product.blockers.includes("source_url_missing")).map((product) => product.handle),
    missingImageProducts: products.filter((product) => product.blockers.includes("image_missing")).map((product) => product.handle),
    missingStockProducts: products.filter((product) => product.blockers.includes("stock_missing")).map((product) => product.handle),
    missingShippingProducts: products.filter((product) => product.blockers.includes("shipping_countries_missing")).map((product) => product.handle),
    telegramCustomerVisibleProducts: products.filter((product) => product.telegramCustomerVisible).map((product) => product.handle),
    blockers: mode === "publish" ? publishBlockers : [],
    products,
    nextManualStep: mode === "publish" && publishBlockers.length ? "Verify source URL, image, cost, selling price, stock, shipping countries, delivery estimate, and compliance review before publishing." : "Draft catalog is controlled and not customer-visible until publish readiness is complete.",
  }
  console.log(JSON.stringify(result, null, 2))
  process.exit(result.success ? 0 : 1)
}
