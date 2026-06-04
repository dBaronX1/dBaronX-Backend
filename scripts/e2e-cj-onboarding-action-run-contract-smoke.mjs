#!/usr/bin/env node
import { execSync } from "node:child_process";
import { read, assert } from "./e2e-production-lock-helpers.mjs";

const workflow = read(".github/workflows/cj-operator-onboarding.yml");
const operator = read("apps/api/src/scripts/cj-operator-onboard-products.ts");
const importer = read(
  "apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts",
);
const publisher = read(
  "apps/api/src/modules/suppliers/cj-import/cj-product-publish.service.ts",
);
const stripeDiff =
  process.env.DBX_CHANGED_FILES ||
  execSync("git diff --name-only HEAD --", { encoding: "utf8" });

for (const mode of [
  "readiness",
  "preview",
  "import",
  "approve-safe",
  "publish-approved",
  "full-safe",
]) {
  assert(
    workflow.includes(`- "${mode}"`),
    `workflow_dispatch mode missing: ${mode}`,
  );
}
assert(
  /category:[\s\S]*type:\s*choice/.test(workflow),
  "category must be a GitHub Actions choice input",
);
for (const category of [
  "all",
  "electronics",
  "fashion",
  "home-living",
  "beauty",
  "sports",
  "automotive",
  "agriculture",
  "tech",
  "finance",
]) {
  assert(
    workflow.includes(`- "${category}"`),
    `category choice missing: ${category}`,
  );
}
assert(
  /mode:[\s\S]*default:\s*"preview"/.test(workflow),
  "mode default must remain preview",
);
assert(
  /category:[\s\S]*default:\s*"all"/.test(workflow),
  "category default must remain all",
);
assert(
  /limitPerCategory:[\s\S]*default:\s*"5"/.test(workflow),
  "limitPerCategory default must remain 5",
);
assert(
  /dryRun:[\s\S]*default:\s*"true"/.test(workflow),
  "dryRun default must remain true",
);
assert(
  /readinessExitZero:[\s\S]*default:\s*"true"/.test(workflow),
  "readinessExitZero default must remain true",
);
for (const envName of [
  "DATABASE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CJ_ACCESS_TOKEN",
  "CJ_API_KEY",
  "MEDUSA_BASE_URL",
  "MEDUSA_PUBLISHABLE_KEY",
  "MEDUSA_ADMIN_API_KEY",
]) {
  assert(
    workflow.includes(`${envName}:`),
    `workflow env mapping missing: ${envName}`,
  );
}
assert(
  !/echo\s+.*\$\{?\s*(DATABASE_URL|SUPABASE_SERVICE_ROLE_KEY|CJ_ACCESS_TOKEN|CJ_API_KEY|MEDUSA_ADMIN_API_KEY)\b/.test(
    workflow,
  ),
  "workflow must not print secret values",
);
assert(
  workflow.includes("missingSecrets") &&
    workflow.includes("github_secret_missing"),
  "workflow must report missing secret names only",
);
assert(
  operator.includes("categoryFetchMode") &&
    operator.includes("sequential_throttled"),
  "operator must report sequential throttled category fetching",
);
assert(
  operator.includes("cj_rate_limited") && operator.includes("categoryDelayMs"),
  "operator must handle supplier API rate limits with throttling/backoff diagnostics",
);
assert(
  operator.includes("totalFetched") &&
    operator.includes("totalPreviewed") &&
    operator.includes("categoryResults"),
  "operator artifact must include preview totals and categoryResults",
);
assert(
  importer.includes("stageFetchedProducts") &&
    importer.includes("validation_status") &&
    importer.includes("pending_admin_approval"),
  "import must write staging records pending approval",
);
assert(
  !/publishApproved\(\)[\s\S]{0,500}stageFetchedProducts/.test(importer),
  "import path must not publish automatically",
);
assert(
  publisher.includes('validation_status", "validated"') ||
    publisher.includes('.eq("validation_status", "validated")'),
  "publish must only load validated products",
);
assert(
  publisher.includes('.eq("approval_status", "approved")'),
  "publish must only load approved products",
);
assert(
  publisher.includes("publicLabels") &&
    publisher.includes('"Verified Supplier"') &&
    publisher.includes('"Direct Shipping"') &&
    publisher.includes('"Global Supplier"'),
  "publish metadata must include safe public labels only",
);
assert(
  !stripeDiff
    .split(/\s+/)
    .some((file) =>
      /^apps\/api\/src\/modules\/(payments|checkout)\/.*(stripe|checkout-session)/.test(
        file,
      ),
    ),
  "Stripe files changed during CJ workflow task; this smoke is additive-only",
);
console.log("CJ onboarding action run contract smoke passed");
