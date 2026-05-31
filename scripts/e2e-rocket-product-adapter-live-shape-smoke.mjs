#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const blockers = [];
const route = await readFile("apps/web/src/app/api/store/products/store-products-response.ts", "utf8");
const routeEntry = await readFile("apps/web/src/app/api/store/products/route.ts", "utf8");
const detailRoute = await readFile("apps/web/src/app/api/store/products/[handle]/route.ts", "utf8");
const server = await readFile("apps/web/src/lib/store-products-server.ts", "utf8");
const client = await readFile("apps/web/src/lib/api/medusa-store-client.ts", "utf8");
const config = await readFile("apps/web/src/server/api/nest-api.config.ts", "utf8");
const grid = await readFile("apps/web/src/components/dbx/ProductViews.tsx", "utf8");
const checkout = await readFile("apps/web/src/components/dbx/StripeCheckoutPanel.tsx", "utf8");
const checkoutClient = await readFile("apps/web/src/lib/checkout/stripe.ts", "utf8");

if (!server.includes("/api/catalog/products") || !route.includes("apiCatalogPath")) blockers.push("rocket_store_route_not_using_api_catalog_products");
if (!config.includes("NEXT_PUBLIC_API_BASE_URL")) blockers.push("rocket_store_route_not_configured_for_next_public_api_base_url");
if (!server.includes("root.data") || !route.includes("catalogEnvelope")) blockers.push("nestjs_envelope_unwrap_missing");
if (!route.includes("envelope.count") || !route.includes("products")) blockers.push("rocket_response_count_products_shape_missing");
for (const marker of ["buyable === true", "productPrimaryVariantId", "priceMinor > 0", "productPrimaryImage"]) {
  if (!route.includes(marker)) blockers.push(`renderable_filter_missing_${marker}`);
}
if (/manualCurated\s*===\s*true|required.*manualCurated|manual_curated/i.test(route)) blockers.push("manual_curated_filter_still_required");
if (!client.includes("variantId: defaultVariantId") || !client.includes("productId")) blockers.push("flat_product_id_variant_id_not_preserved");
for (const marker of ["Men's Cotton Linen Long Sleeve Casual Shirt", "mens-cotton-linen-long-sleeve-casual-shirt", "prod_01KSW407FCTENNMQ17HHMQB115", "variant_01KSW407S5GFEBDCZY14CXBH3Q"]) {
  if (route.includes(marker) || server.includes(marker) || client.includes(marker) || grid.includes(marker)) blockers.push(`hardcoded_shirt_detected_${marker}`);
}
if (/x-publishable-api-key|NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY|NEXT_PUBLIC_MEDUSA_BASE_URL/.test(`${route}\n${routeEntry}\n${detailRoute}\n${server}\n${client}\n${grid}`)) blockers.push("rocket_storefront_medusa_public_dependency_detected");
for (const marker of ["title", "productPrimaryImage", "productDisplayPrice", "supplier", "Add to Cart", "Buy Now", "/products/"]) {
  if (!grid.includes(marker)) blockers.push(`product_card_marker_missing_${marker}`);
}
for (const marker of ["productId", "variantId", "priceMinor", "quantity", "currency", "productName", "imageUrl"]) {
  if (!checkout.includes(marker) && !checkoutClient.includes(marker)) blockers.push(`checkout_normalized_field_missing_${marker}`);
}
if (!checkoutClient.includes("/api/checkout/session")) blockers.push("checkout_not_calling_nestjs_session_route");

console.log(JSON.stringify({ success: blockers.length === 0, blockers }, null, 2));
process.exit(blockers.length ? 1 : 0);
