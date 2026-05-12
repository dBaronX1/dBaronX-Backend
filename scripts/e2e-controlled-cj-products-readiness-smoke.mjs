#!/usr/bin/env node
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../apps/medusa/src/scripts/controlled-cj-products.ts", import.meta.url), "utf8");
const handles = [...source.matchAll(/handle:\s*"([^"]+)"/g)].map((match) => match[1]);
const required = [
  "wireless-charger-dual-mobile-phone-charger",
  "bluetooth-51-wireless-earbuds-ear-hook",
  "portable-blender-mini-juicer-cup",
  "pet-hair-remover-mitt-glove",
  "round-handle-pet-passage-comb",
  "jewelry-box-door-rotating-large-capacity",
];
const blockers = [];
for (const handle of required) if (!handles.includes(handle)) blockers.push(`missing_${handle}`);
const productSections = source.split(/\n\s*\{\n\s*title:/).slice(1);
const missingSourceUrlProducts = productSections.filter((section) => !/sourceUrl:/.test(section)).map(handleOf);
const missingImageProducts = productSections.filter((section) => !/imageUrl:/.test(section)).map(handleOf);
const missingStockProducts = productSections.filter((section) => !/inventory:\s*\d+/.test(section)).map(handleOf);
const missingShippingProducts = productSections.filter((section) => !/shipTo:\s*\[/.test(section)).map(handleOf);
const complianceReviewRequiredProducts = productSections.filter((section) => /Battery|Charger|Bluetooth|wireless|Type-C/i.test(section) && !/verified_for_checkout/.test(section)).map(handleOf);
const result = {
  success: blockers.length === 0,
  blockers,
  totalControlledProducts: handles.length,
  draftProducts: (source.match(/draft_pending_verification/g) || []).length,
  publishReadyProducts: 0,
  verifiedProducts: (source.match(/verified_for_checkout/g) || []).length - 2,
  complianceReviewRequiredProducts,
  missingSourceUrlProducts,
  missingImageProducts,
  missingStockProducts,
  missingShippingProducts,
  telegramCustomerVisibleProducts: [],
  nextManualStep: blockers.length ? "Restore all required controlled CJ seed candidates." : "Verify source URLs, stock, shipping, costs, prices, and compliance before publish mode.",
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);

function handleOf(section) {
  return section.match(/handle:\s*"([^"]+)"/)?.[1] || "unknown";
}
