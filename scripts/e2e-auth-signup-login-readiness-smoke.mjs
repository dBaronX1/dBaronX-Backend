#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const files = {
  signup: "apps/web/src/app/signup/page.tsx",
  login: "apps/web/src/app/login/page.tsx",
  callback: "apps/web/src/app/auth/callback/route.ts",
  supabase: "apps/web/src/lib/supabase-client.ts",
  bootstrapModule: "apps/api/src/modules/bootstrap/bootstrap.module.ts",
};
const blockers = [];
for (const [key, file] of Object.entries(files)) if (!existsSync(file)) blockers.push(`${key}_missing`);
const webText = Object.values(files).filter(existsSync).map((file) => readFileSync(file, "utf8")).join("\n");
const serviceRoleNotInFrontend = !/SUPABASE_SERVICE_ROLE_KEY/.test(webText);
if (!serviceRoleNotInFrontend) blockers.push("service_role_key_referenced_in_frontend");
const result = {
  success: blockers.length === 0,
  blockers,
  supabaseUrlPresent: /NEXT_PUBLIC_SUPABASE_URL/.test(webText),
  anonKeyPresent: /NEXT_PUBLIC_SUPABASE_ANON_KEY/.test(webText),
  serviceRoleNotInFrontend,
  signupRoutePresent: existsSync(files.signup),
  loginRoutePresent: existsSync(files.login),
  callbackRoutePresent: existsSync(files.callback),
  referralCaptureReady: /referral|ref=|referral_code/.test(webText),
  profileCreationReady: /dbx_profiles|dbx_bootstrap_first_owner_user|onboarding/.test(readFileSync("supabase/migrations/202605110001_dbx_platform_foundation.sql", "utf8")),
  ownerBootstrapReady: existsSync(files.bootstrapModule),
  redirectUrlsLikelyReady: /NEXT_PUBLIC_SITE_URL|NEXT_PUBLIC_APP_URL|window\.location\.origin/.test(webText) && !/localhost:3000/.test(webText),
  nextManualStep: blockers.length ? "Fix missing auth route/bootstrap files." : "Configure Supabase Site URL and Redirect URLs for production /auth/callback before deploy.",
};
console.log(JSON.stringify(result, null, 2));
process.exit(result.success ? 0 : 1);
