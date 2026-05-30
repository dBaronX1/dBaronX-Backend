#!/usr/bin/env node
import { readFileSync } from "node:fs";

const checks = [
  {
    file: "apps/web/src/app/api/store/products/store-products-response.ts",
    required: ["nestApiRequest", "/api/storefront/products"],
    blocked: ["@supabase/supabase-js", "fetchSupabase", "MEDUSA_BACKEND_URL", "NEXT_PUBLIC_MEDUSA", "x-publishable-api-key"],
  },
  {
    file: "apps/web/src/lib/store-products-server.ts",
    required: ["nestApiRequest", "/api/storefront/products"],
    blocked: ["@supabase/supabase-js", "fetchSupabase", "MEDUSA_BACKEND_URL", "NEXT_PUBLIC_MEDUSA", "x-publishable-api-key"],
  },
  {
    file: "apps/web/src/lib/api/medusa-store-client.ts",
    required: ["/api/store/products"],
    blocked: ["NEXT_PUBLIC_MEDUSA", "MEDUSA_BACKEND_URL", "x-publishable-api-key", "medusaStoreUrl", "fetchInternalStoreProducts"],
  },
];

const failures = [];
for (const check of checks) {
  const text = readFileSync(check.file, "utf8");
  for (const token of check.required) {
    if (!text.includes(token)) failures.push(`${check.file}: missing required NestJS/API boundary marker ${token}`);
  }
  for (const token of check.blocked) {
    if (text.includes(token)) failures.push(`${check.file}: contains blocked direct backend marker ${token}`);
  }
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Rocket storefront product flow routes through NestJS/API boundary only.");
