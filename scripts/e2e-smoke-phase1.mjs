#!/usr/bin/env node
const checks = [
  ["web-to-api health", `${process.env.WEB_URL || "http://localhost:3000"}/api/health`],
  ["api-to-medusa health", `${process.env.API_URL || "http://localhost:3001"}/api/v1/commerce/health`],
  ["medusa-store-products", `${process.env.MEDUSA_URL || "http://localhost:9000"}/store/products`],
  ["fastapi-health", `${process.env.FASTAPI_URL || "http://localhost:8000"}/health`],
  ["telegram-health", `${process.env.TELEGRAM_BOT_URL || "http://localhost:8080"}/health`],
];
for (const [name, url] of checks) {
  const headers = {};
  if (name === "medusa-store-products" && process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY) headers["x-publishable-api-key"] = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY;
  try { const r = await fetch(url, { headers }); console.log(`${name}: ${r.status}`);} catch (e) { console.log(`${name}: ERROR ${e.message}`); process.exitCode=1; }
}
