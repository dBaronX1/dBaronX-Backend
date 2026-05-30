#!/usr/bin/env node

import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const workflowPaths = [
  ".github/workflows/medusa-manual-cj-curated-products.yml",
  ".github/workflows/medusa-publishable-key.yml",
  ".github/workflows/medusa-first-product-seed.yml",
];

const contractSmokePath = "scripts/e2e-medusa-database-contract-smoke.mjs";
const authSmokePath = "scripts/e2e-medusa-db-auth-diagnostics-smoke.mjs";
const contractSmoke = readFileSync(contractSmokePath, "utf8");
const authSmoke = readFileSync(authSmokePath, "utf8");

const databaseFromMedusaSecret =
  /^\s*DATABASE_URL:\s*\$\{\{\s*secrets\.MEDUSA_DATABASE_URL\s*\}\}\s*$/m;
const medusaDatabaseFromMedusaSecret =
  /^\s*MEDUSA_DATABASE_URL:\s*\$\{\{\s*secrets\.MEDUSA_DATABASE_URL\s*\}\}\s*$/m;

for (const workflowPath of workflowPaths) {
  const workflow = readFileSync(workflowPath, "utf8");
  assert(
    databaseFromMedusaSecret.test(workflow),
    `${workflowPath} must set DATABASE_URL from secrets.MEDUSA_DATABASE_URL`,
  );
  assert(
    medusaDatabaseFromMedusaSecret.test(workflow),
    `${workflowPath} must set MEDUSA_DATABASE_URL from secrets.MEDUSA_DATABASE_URL`,
  );
  assert(
    !/secrets\.DATABASE_URL/.test(workflow),
    `${workflowPath} must not use secrets.DATABASE_URL`,
  );
  assert(
    !/DEFAULT_DATABASE_URL|EXTERNAL_DATABASE_URL/.test(workflow),
    `${workflowPath} must not use alternate database URL fallbacks`,
  );
  assert(
    workflow.includes(
      "If this workflow uses a GitHub Environment, update the Environment secret too.",
    ),
    `${workflowPath} must warn about GitHub Environment secret overrides`,
  );
}

assert(
  contractSmoke.includes(`safeCode === "28000"`) &&
    contractSmoke.includes(`result.errorCode = "medusa_database_auth_failed"`) &&
    contractSmoke.includes(`result.connectionFailureKind = "auth_failed"`),
  "SQLSTATE 28000 must map to medusa_database_auth_failed/auth_failed",
);
assert(
  contractSmoke.includes(
    "Postgres rejected the MEDUSA_DATABASE_URL credentials. Re-copy the full current Render Postgres External Database URL using the Render copy button. Update GitHub repository secret MEDUSA_DATABASE_URL and any GitHub Environment secret MEDUSA_DATABASE_URL, especially Production. If the Render DB password was rotated, old URLs will fail.",
  ),
  "28000 nextAction must mention repository secret and environment secret",
);
assert(
  contractSmoke.includes("usingMedusaDatabaseSecret: true") &&
    contractSmoke.includes("usingGenericDatabaseSecret: false") &&
    contractSmoke.includes("databaseUrlEqualsMedusaDatabaseUrl: false") &&
    contractSmoke.includes(`secretSourceHint: "MEDUSA_DATABASE_URL"`) &&
    contractSmoke.includes(
      `"DATABASE_URL_AND_MEDUSA_DATABASE_URL_BOTH_FROM_MEDUSA_DATABASE_URL_SECRET"`,
    ),
  "DB contract artifact must include safe secret-source diagnostics",
);
assert(
  contractSmoke.includes("medusaDatabaseUrl === genericDatabaseUrl"),
  "DB contract artifact must prove DATABASE_URL equals MEDUSA_DATABASE_URL without printing either value",
);
assert(
  !contractSmoke.includes("medusaDatabaseUrl || genericDatabaseUrl"),
  "Medusa DB contract smoke must never fall back to generic DATABASE_URL",
);

const combinedSmoke = `${contractSmoke}\n${authSmoke}`;
const unsafePrintPatterns = [
  /console\.(?:log|error|warn)\([^)]*(?:process\.env\.(?:DATABASE_URL|MEDUSA_DATABASE_URL)|medusaDatabaseUrl|genericDatabaseUrl|databaseUrl|connectionString)/s,
  /JSON\.stringify\([^)]*(?:process\.env\.(?:DATABASE_URL|MEDUSA_DATABASE_URL)|medusaDatabaseUrl|genericDatabaseUrl|databaseUrl|connectionString)/s,
  /new URL\((?:medusaDatabaseUrl|genericDatabaseUrl|databaseUrl|connectionString)/,
  /\.hostname\b|\.host\b|\.username\b|\.password\b|\.pathname\b/,
  /length\b[^\n]*(?:medusaDatabaseUrl|genericDatabaseUrl|databaseUrl|connectionString)/,
];
for (const pattern of unsafePrintPatterns) {
  assert(
    !pattern.test(combinedSmoke),
    `Medusa DB diagnostics must not print or derive DB URL/host/user/password/db-name/raw length: ${pattern}`,
  );
}

console.log(
  JSON.stringify(
    {
      success: true,
      smoke: "medusa_workflow_db_secret_contract",
      workflows: workflowPaths,
      contract:
        "DATABASE_URL_AND_MEDUSA_DATABASE_URL_BOTH_FROM_MEDUSA_DATABASE_URL_SECRET",
    },
    null,
    2,
  ),
);
