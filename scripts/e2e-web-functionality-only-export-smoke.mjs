import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const exportRoot = path.join(repoRoot, "apps/web/.functionality-export");

const requiredFiles = [
  "src/lib/env.ts",
  "src/lib/public-config.ts",
  "src/app/api/public-config/route.ts",
  "src/lib/supabase/client.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/runtime-client.ts",
  "src/app/auth/callback/route.ts",
  "src/lib/auth/referral-capture.ts",
  "src/lib/api/dbx-api-client.ts",
  "src/lib/api/medusa-store-client.ts",
  "src/lib/hooks/useAuthSession.ts",
  "src/lib/hooks/useMedusaProducts.ts",
  "src/lib/hooks/useFirstProduct.ts",
];

const forbiddenUiComponents = [
  "apps/web/src/components/rocket/RocketShell.tsx",
  "apps/web/src/components/rocket/StaticPages.tsx",
  "apps/web/src/components/rocket/ProductViews.tsx",
  "apps/web/src/components/rocket/CustomerAccountPanel.tsx",
];

const forbiddenCustomerTerms = [
  "Rocket production UI",
  "Runtime auth",
  "Medusa Store API",
  "products are syncing",
  "medusa_store_env_missing",
  "endpoint",
  "blocker",
];

const secretValuePatterns = [
  /DATABASE_URL\s*=\s*[^\s"'`]+/i,
  /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s"'`]+/i,
  /(?:sk_live|sk_test|pk_live)_[A-Za-z0-9_\-]+/,
  /postgres(?:ql)?:\/\/[^\s"'`]+/i,
  /service_role[^\n"'`:=]*[:=]\s*["'`]?[A-Za-z0-9._\-]{20,}/i,
];

function fail(message, details = []) {
  console.error(`FAIL: ${message}`);
  for (const detail of details) console.error(` - ${detail}`);
  process.exitCode = 1;
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else files.push(full);
  }
  return files;
}

function relative(file) {
  return path.relative(repoRoot, file).replaceAll(path.sep, "/");
}

if (!fs.existsSync(exportRoot) || !fs.statSync(exportRoot).isDirectory()) {
  fail("apps/web/.functionality-export does not exist");
}

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(exportRoot, file)));
if (missing.length) fail("required functionality export files are missing", missing);

const exportedFiles = walk(exportRoot).map(relative).sort();
const unexpectedFiles = exportedFiles.filter((file) => {
  const insideExport = file.replace("apps/web/.functionality-export/", "");
  return !requiredFiles.includes(insideExport);
});
if (unexpectedFiles.length) fail("functionality export includes files outside the approved allowlist", unexpectedFiles);

const uiInExport = exportedFiles.filter(
  (file) =>
    file.includes("/components/") ||
    file.endsWith(".tsx") ||
    /(?:Shell|Page|View|Panel|Card|Button|Modal)\.(?:t|j)sx?$/.test(path.basename(file)),
);
if (uiInExport.length) fail("functionality export includes UI-shaped files", uiInExport);

const stillPresentUi = forbiddenUiComponents.filter((file) => fs.existsSync(path.join(repoRoot, file)));
if (stillPresentUi.length) fail("quarantined generated UI component files are still present", stillPresentUi);

const secretHits = [];
for (const file of exportedFiles) {
  const text = fs.readFileSync(path.join(repoRoot, file), "utf8");
  for (const pattern of secretValuePatterns) {
    if (pattern.test(text)) secretHits.push(`${file} matches ${pattern}`);
  }
}
if (secretHits.length) fail("functionality export appears to include secret values", secretHits);

const customerRoots = [path.join(repoRoot, "apps/web/src/app"), path.join(repoRoot, "apps/web/src/components")];
const customerFiles = customerRoots
  .flatMap((root) => walk(root))
  .filter((file) => /\.(?:tsx|ts|jsx|js|mdx)$/.test(file))
  .filter((file) => !relative(file).includes("apps/web/src/app/(platform)/"))
  .filter((file) => !relative(file).includes("apps/web/src/components/platform/"));

const customerCopyHits = [];
for (const file of customerFiles) {
  const text = fs.readFileSync(file, "utf8");
  for (const term of forbiddenCustomerTerms) {
    if (text.includes(term)) customerCopyHits.push(`${relative(file)} contains ${term}`);
  }
}
if (customerCopyHits.length) fail("public customer copy contains forbidden internal terms", customerCopyHits);

if (process.exitCode) process.exit(process.exitCode);
console.log("Functionality-only export readiness smoke passed.");
console.log(`Verified ${requiredFiles.length} approved files and ${customerFiles.length} public customer source files.`);
