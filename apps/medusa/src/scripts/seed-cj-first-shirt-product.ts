import type { ExecArgs } from "@medusajs/framework/types";

import { reseedCjFirstProductCanonical } from "./reseed-cj-first-product-canonical";
import {
  verificationBlockersFor,
} from "./seed-first-real-supplier-product";
import type { FirstProductInput } from "./seed-first-real-supplier-product";

const CONFIRM_ENV = "DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED";

const inputWithoutBlockers = {
  mode: "publish" as const,
  title: "Men's Cotton Linen Long Sleeve Casual Shirt",
  handle: "mens-cotton-linen-long-sleeve-casual-shirt",
  description:
    "A breathable cotton linen long sleeve casual shirt for men's spring and autumn outfits.",
  priceAmount: 1999,
  supplierCostAmount: 419,
  supplier: "cj",
  supplierProductId: "2408300732091605000",
  supplierSku: "CJDS212420104DW",
  sourceUrl:
    "https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html",
  imageUrl:
    "https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp",
  stockQty: 32,
  shippingCountries: ["US"],
  deliveryEstimate: "7-15 business days",
};

function refuse(error: string, details: Record<string, unknown> = {}): never {
  console.error(JSON.stringify({ success: false, error, ...details }, null, 2));
  process.exit(1);
}

function selectedCjFirstProductInput(): FirstProductInput {
  if (process.env[CONFIRM_ENV] !== "true") {
    refuse("DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED_required", {
      requiredEnv: `${CONFIRM_ENV}=true`,
      reason:
        "This one-command profile seeds exactly one verified CJ product and requires explicit operator confirmation.",
    });
  }

  const verificationBlockers = verificationBlockersFor(inputWithoutBlockers);
  if (verificationBlockers.length) {
    refuse("selected_cj_first_product_profile_invalid", {
      blockers: verificationBlockers,
    });
  }

  return { ...inputWithoutBlockers, verificationBlockers };
}

export default async function seedSelectedCjFirstShirtProduct(args: ExecArgs) {
  selectedCjFirstProductInput();
  return reseedCjFirstProductCanonical(args);
}
