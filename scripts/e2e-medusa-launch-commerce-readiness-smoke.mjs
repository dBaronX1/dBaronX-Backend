#!/usr/bin/env node
import { readFileSync } from "node:fs";
const files = [
  "apps/medusa/src/scripts/ensure-launch-sales-channel-consistency.ts",
  "apps/medusa/src/scripts/ensure-publishable-api-key.ts",
  "apps/medusa/src/scripts/shipping-readiness.ts",
];
const text = files.map((file) => readFileSync(file, "utf8")).join("\n");
if (/default_sales_channel/.test(text)) { console.error("launch commerce scripts still reference unsupported store default sales channel fields"); process.exit(1); }
for (const marker of ["publishableKeyLinked", "stockLocationLinked", "productLinked", "shipping_option_not_visible_for_canonical_store_context"]) {
  if (!text.includes(marker)) { console.error(`missing readiness marker: ${marker}`); process.exit(1); }
}
console.log("launch commerce readiness avoids unsupported store default sales channel fields");
