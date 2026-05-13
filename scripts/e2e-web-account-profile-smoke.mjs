#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = [
  "apps/web/src/components/rocket/CustomerAccountPanel.tsx",
  "apps/web/src/app/account/page.tsx",
  "apps/web/src/app/profile/page.tsx",
  "apps/web/src/lib/hooks/useAuthSession.ts",
  "apps/web/src/lib/supabase/runtime-client.ts",
  "apps/web/src/app/api/public-config/route.ts",
  "apps/web/src/app/auth/callback/route.ts",
];

const missing = files.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(`Account/profile smoke failed; missing files: ${missing.join(", ")}`);
  process.exit(1);
}

const accountPanel = readFileSync("apps/web/src/components/rocket/CustomerAccountPanel.tsx", "utf8");
for (const marker of ["useAuthSession", "Supabase Auth", "raw runtime errors", "/login?next="]) {
  if (!accountPanel.includes(marker)) {
    console.error(`Account/profile smoke failed; missing marker: ${marker}`);
    process.exit(1);
  }
}

console.log("Account/profile smoke passed.");
