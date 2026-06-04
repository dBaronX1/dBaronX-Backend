#!/usr/bin/env node
import { read, assert } from "./e2e-production-lock-helpers.mjs";
const catalog = read("apps/api/src/modules/catalog/catalog.service.ts");
const types = read("apps/api/src/modules/catalog/catalog.types.ts");
const publisher = read(
  "apps/api/src/modules/suppliers/cj-import/cj-product-publish.service.ts",
);
for (const field of [
  "id",
  "productId",
  "variantId",
  "handle",
  "title",
  "description",
  "imageUrl",
  "thumbnail",
  "images",
  "priceMinor",
  "currencyCode",
  "category",
  "buyable",
  "deliveryEstimate",
  "publicLabels",
]) {
  assert(
    new RegExp(`${field}:`).test(types) ||
      new RegExp(`${field}[?]?:`).test(types),
    `public catalog type missing ${field}`,
  );
  assert(
    catalog.includes(`${field}:`) || catalog.includes(`${field},`),
    `catalog normalizer missing ${field}`,
  );
}
assert(
  catalog.includes("fetchStorefrontProducts"),
  "catalog must preserve backend storefront fallback for published import visibility",
);
assert(
  publisher.includes("medusa_product_id: medusaProductId"),
  "publish must store created commerce product id for catalog fallback",
);
assert(
  publisher.includes("medusa_variant_id: medusaVariantId"),
  "publish must store created commerce variant id for buyable catalog fallback",
);
assert(
  publisher.includes("images: item.image_url ? [item.image_url] : []"),
  "publish must preserve original/source image in storefront images",
);
assert(
  /imageUrls\([\s\S]*add\(product\.image_url\)[\s\S]*add\(metadata\.imageUrl\)[\s\S]*product\.images[\s\S]*add\(product\.thumbnail\)/.test(
    catalog,
  ),
  "imageUrl selection must prefer source/original images before thumbnail",
);
assert(
  !/lineItems\.slice\(0,\s*1\)|one shirt fallback|hardcoded one-shirt/i.test(
    catalog,
  ),
  "catalog must not regress to a one-shirt fallback",
);
console.log("CJ published products catalog visibility smoke passed");
