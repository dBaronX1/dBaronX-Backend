#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const roots = ["apps/web/src/app", "apps/web/src/components/auth", "apps/web/src/components/dbx", "apps/web/public"];
const blocked = [/Rocket/i, /Codex/i, /Medusa/i, /Store API/i, /Supabase/i, /Runtime auth/i, /products are syncing/i, /medusa_store_env_missing/i, /endpoint/i, /blocker/i, /launch-commerce/i, /operational surface/i];
const allowedPath = /(^|\/)(scripts|docs|internal)(\/|$)|apps\/web\/src\/app\/\(platform\)\//;
const exts = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".svg", ".json"]);
const files = [];
function walk(dir) { for (const name of readdirSync(dir)) { const path = join(dir, name); const st = statSync(path); if (st.isDirectory()) walk(path); else if ([...exts].some((ext) => path.endsWith(ext))) files.push(path); } }
for (const root of roots) walk(root);
const failures = [];
for (const file of files) {
  const rel = relative(process.cwd(), file).replaceAll("\\", "/");
  if (allowedPath.test(rel) || rel.includes("/auth/callback/")) continue;
  const text = readFileSync(file, "utf8");
  for (const pattern of blocked) if (pattern.test(text)) failures.push(`${rel}: ${pattern}`);
}
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("public customer UI contains no forbidden implementation terms");
