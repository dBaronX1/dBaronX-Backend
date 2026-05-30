import fs from "node:fs";

const service = fs.readFileSync("apps/api/src/modules/catalog/catalog.service.ts", "utf8");
const controller = fs.readFileSync("apps/api/src/modules/catalog/catalog.controller.ts", "utf8");
const platform = fs.readFileSync("apps/api/src/modules/platform/platform.module.ts", "utf8");

const required = [
  [controller.includes('"products"') && controller.includes('"products/:handle"') && controller.includes('"readiness"'), "catalog controller exposes products, detail, readiness"],
  [service.includes("/store/products"), "catalog service calls Medusa Store API internally"],
  [service.includes("MEDUSA_BASE_URL") && service.includes("MEDUSA_PUBLISHABLE_KEY"), "catalog service uses server-side Medusa env"],
  [service.includes("metadataPublic") && service.includes("supplierPrice") === false, "catalog service emits safe public metadata only"],
  [platform.includes("CatalogModule"), "CatalogModule is registered"],
];

const failed = required.filter(([ok]) => !ok);
if (failed.length) {
  console.error(JSON.stringify({ success: false, failed: failed.map(([, message]) => message) }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ success: true, checked: required.map(([, message]) => message) }, null, 2));
