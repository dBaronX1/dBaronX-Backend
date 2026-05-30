import fs from "node:fs";
import path from "node:path";

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" || entry.name === ".next" ? [] : walk(full);
    return entry.isFile() ? [full] : [];
  });
}

const files = walk("apps/web/src").filter((file) => /\.(ts|tsx)$/.test(file));
const source = files.map((file) => [file, fs.readFileSync(file, "utf8")]);
const forbidden = [/NEXT_PUBLIC_MEDUSA_/g, /MEDUSA_PUBLISHABLE_KEY/g, /MEDUSA_BACKEND_URL/g, /x-publishable-api-key/g];
const violations = [];
for (const [file, text] of source) {
  for (const pattern of forbidden) {
    if (pattern.test(text)) violations.push({ file, pattern: String(pattern) });
    pattern.lastIndex = 0;
  }
}
const server = fs.readFileSync("apps/web/src/lib/store-products-server.ts", "utf8");
const client = fs.readFileSync("apps/web/src/lib/api/medusa-store-client.ts", "utf8");
const route = fs.readFileSync("apps/web/src/app/api/store/products/store-products-response.ts", "utf8");
const env = fs.readFileSync("apps/web/src/lib/env.ts", "utf8");
const required = [
  server.includes("NEXT_PUBLIC_API_BASE_URL") && server.includes("/api/catalog/products"),
  client.includes("/api/catalog/products"),
  route.includes("/api/catalog/products") && route.includes("nestjs_catalog_proxy"),
  env.includes("NEXT_PUBLIC_API_BASE_URL") && !env.includes("NEXT_PUBLIC_MEDUSA_"),
];
if (violations.length || required.some((ok) => !ok)) {
  console.error(JSON.stringify({ success: false, violations, required }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ success: true, checkedFiles: files.length }, null, 2));
