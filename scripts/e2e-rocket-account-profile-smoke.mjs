#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const failures = [];
const exists = (file) => existsSync(file);
const read = (file) => (exists(file) ? readFileSync(file, "utf8") : "");
const record = (condition, message) => {
  if (!condition) failures.push(message);
};

const files = {
  account: "apps/web/src/app/account/page.tsx",
  profile: "apps/web/src/app/profile/page.tsx",
  panel: "apps/web/src/components/dbx/CustomerAccountPanel.tsx",
  authContext: "apps/web/src/contexts/AuthContext.tsx",
  authHook: "apps/web/src/lib/hooks/useAuthSession.ts",
  layout: "apps/web/src/app/layout.tsx",
  runtimeClient: "apps/web/src/lib/supabase/runtime-client.ts",
  register: "apps/web/src/app/register/page.tsx",
  login: "apps/web/src/app/login/page.tsx",
};

for (const [label, file] of Object.entries(files)) record(exists(file), `${label} file missing: ${file}`);

const account = read(files.account);
const profile = read(files.profile);
const panel = read(files.panel);
const authContext = read(files.authContext);
const layout = read(files.layout);
const register = read(files.register);
const login = read(files.login);
const clientAccountSource = [account, profile, panel, authContext, read(files.authHook), read(files.runtimeClient)].join("\n");

record(account.includes("DbxAccountPage"), "/account must render the Rocket account page.");
record(profile.includes("DbxAccountPage") && profile.includes("profile"), "/profile must alias the profile mode.");
record(authContext.includes("createContext") && authContext.includes("getSupabaseRuntimeBrowserClient"), "AuthContext must use the Supabase runtime auth client/session.");
record(layout.includes("AuthProvider"), "Root layout must provide AuthContext.");
record(panel.includes("useAuthSession"), "Account panel must use AuthContext via useAuthSession.");
record(panel.includes("Sign out") && panel.includes("signOut"), "Account page must include sign out.");
record(panel.includes("Save profile") && panel.includes("updateProfile"), "Account page must include profile update UI.");
record(panel.includes("Delete account request") && panel.includes("/support?topic=delete-account"), "Account page must include customer-safe delete account request link.");
record(panel.includes("Customer reference"), "Account page must show a safe customer reference.");
record(panel.includes("referral code") || panel.includes("Referral link"), "Account page must show referral details when available.");
record(register.includes('safeLocalPath(params.get("next"), "/account")'), "Register must default successful users to /account.");
record(login.includes('safeLocalPath(params.get("next"), "/account")'), "Login must default successful users to /account.");
record(register.includes('source: "rocket_web"'), "Register must include rocket_web metadata.");
record(register.includes("referral_code") || register.includes("referralMetadata"), "Register must preserve optional referral code metadata.");

const forbiddenClientSecrets = [
  /SUPABASE_SERVICE_ROLE/i,
  /SERVICE_ROLE_KEY/i,
  /STRIPE_SECRET/i,
  /CJ_.*TOKEN/i,
  /TELEGRAM_.*TOKEN/i,
  /DATABASE_URL/i,
  /MEDUSA_ADMIN/i,
  /INTERNAL_SERVICE_TOKEN/i,
];
for (const pattern of forbiddenClientSecrets) {
  record(!pattern.test(clientAccountSource), `Client account/profile code references forbidden secret pattern: ${pattern}`);
}
record(clientAccountSource.includes("NEXT_PUBLIC_SUPABASE_URL") || clientAccountSource.includes("supabaseUrl"), "Supabase client should rely on public URL config.");
record(clientAccountSource.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY") || clientAccountSource.includes("supabaseAnonKey"), "Supabase client should rely on public anon key config.");

if (failures.length > 0) {
  console.error("[rocket-account-profile-smoke] FAIL");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("[rocket-account-profile-smoke] PASS");
