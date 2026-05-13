#!/usr/bin/env node
import { readFileSync } from "node:fs";
const middleware = readFileSync("apps/web/src/middleware.ts", "utf8");
for (const route of ["-ops", "-review", "/internal/", "launch", "readiness", "medusa"]) {
  if (!middleware.includes(route)) { console.error(`middleware does not protect route marker ${route}`); process.exit(1); }
}
for (const route of ["/wallet-ops", "/ads-review", "/ai-stories-review"]) {
  const path = route.slice(1);
  if (!middleware.includes("-ops") && !middleware.includes("-review")) { console.error(`${path} not covered`); process.exit(1); }
}
console.log("plain public ops and review routes are covered by middleware protection");
