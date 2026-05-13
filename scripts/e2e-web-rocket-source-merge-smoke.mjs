#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "apps/web/src/components/rocket/RocketShell.tsx",
  "apps/web/src/components/rocket/ProductViews.tsx",
  "apps/web/src/components/rocket/CustomerAccountPanel.tsx",
  "apps/web/public/assets/images/app_logo.svg",
  "apps/web/public/assets/images/no_image.svg",
  "apps/web/src/app/home/page.tsx",
  "apps/web/src/app/products/[handle]/page.tsx",
  "apps/web/src/app/checkout/success/page.tsx",
  "apps/web/src/app/not-found.tsx",
  "apps/web/src/app/error.tsx",
];

const missing = requiredFiles.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Rocket web source merge smoke failed; missing files: ${missing.join(", ")}`);
  process.exit(1);
}

const binaryPlaceholders = [".png", ".jpg", ".jpeg", ".webp", ".gif"].filter((ext) =>
  requiredFiles.some((file) => file.endsWith(ext)),
);
if (binaryPlaceholders.length) {
  console.error("Rocket web source merge smoke failed; binary image placeholders are not allowed.");
  process.exit(1);
}

const shell = readFileSync("apps/web/src/components/rocket/RocketShell.tsx", "utf8");
if (!shell.includes("/assets/images/app_logo.svg") || !shell.includes("Rocket production navigation")) {
  console.error("Rocket shell does not include production SVG logo/navigation markers.");
  process.exit(1);
}

console.log("Rocket web source merge smoke passed.");
