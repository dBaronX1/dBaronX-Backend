#!/usr/bin/env node
const req = (name) => process.env[name] || "";
const env = ["WEB_URL","API_URL","FASTAPI_URL","MEDUSA_URL","MEDUSA_PUBLISHABLE_KEY","TELEGRAM_BOT_URL"];
for (const k of env) if (!req(k)) console.log(`WARN missing ${k}`);

const checks = [
  ["web-health", `${req("WEB_URL")}/health`],
  ["api-health", `${req("API_URL")}/health`],
  ["fastapi-health", `${req("FASTAPI_URL")}/health`],
  ["medusa-store-products", `${req("MEDUSA_URL")}/store/products`],
  ["api-commerce-health", `${req("API_URL")}/api/v1/commerce/health`],
  ["telegram-health", `${req("TELEGRAM_BOT_URL")}/health`],
];
if (req("INTERNAL_SERVICE_TOKEN")) checks.push(["api-catalog-preview-sync", `${req("API_URL")}/api/v1/commerce/catalog/preview-sync`]);
for (const [name,url] of checks){
  const headers={};
  if (name==="medusa-store-products" && req("MEDUSA_PUBLISHABLE_KEY")) headers["x-publishable-api-key"]=req("MEDUSA_PUBLISHABLE_KEY");
  if (name.startsWith("api-") && req("INTERNAL_SERVICE_TOKEN")) headers["x-internal-service-token"]=req("INTERNAL_SERVICE_TOKEN");
  try { const r=await fetch(url,{headers}); console.log(`${name}: ${r.status}`); if(!r.ok) process.exitCode=1; }
  catch(e){ console.log(`${name}: ERROR ${e.message}`); process.exitCode=1; }
}
