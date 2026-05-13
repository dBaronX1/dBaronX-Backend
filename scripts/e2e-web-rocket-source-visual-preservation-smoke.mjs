#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const required = [
  "apps/web/src/components/dbx/DbxVisualShell.tsx",
  "apps/web/src/components/auth/DbxAuthShell.tsx",
  "apps/web/src/app/register/page.tsx",
  "apps/web/src/app/login/page.tsx",
  "apps/web/src/app/account/page.tsx",
  "apps/web/src/app/shop/page.tsx",
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) { console.error(`missing required customer visual files: ${missing.join(", ")}`); process.exit(1); }
const combined = required.map((file) => readFileSync(file, "utf8")).join("\n");
for (const marker of ["dBaronX", "radial-gradient", "linear-gradient", "x.com/dbaronx", "instagram.com/dbaronx", "tiktok.com/@dbaronx", "data-dbx-visual-ui"] ) {
  if (!combined.includes(marker)) { console.error(`missing visual marker: ${marker}`); process.exit(1); }
}
for (const forbidden of ["Rocket production UI", "Runtime auth", "Store API", "products are syncing"]) {
  if (combined.includes(forbidden)) { console.error(`public route still includes generated copy: ${forbidden}`); process.exit(1); }
}
console.log("dBaronX visual markers and public customer routes are present");
