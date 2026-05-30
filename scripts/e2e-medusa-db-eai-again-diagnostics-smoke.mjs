#!/usr/bin/env node

import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const smoke = readFileSync(
  "scripts/e2e-medusa-database-contract-smoke.mjs",
  "utf8",
);

assert(
  smoke.includes(`safeCode === "28000"`),
  "SQLSTATE 28000 must keep a dedicated auth-failure branch",
);
assert(
  smoke.includes(`result.errorCode = "medusa_database_auth_failed"`),
  "28000 must map to medusa_database_auth_failed instead of generic connection failure",
);
assert(
  smoke.includes(`result.errorCode = "medusa_database_connection_failed"`),
  "non-28000 connection failures, including EAI_AGAIN, must map to medusa_database_connection_failed",
);
assert(
  smoke.includes(`result.connectionFailureKind = "connection_failed"`),
  "non-auth connection failures must remain connection_failed",
);
assert(
  smoke.includes("Verify MEDUSA_DATABASE_URL is reachable from GitHub Actions") &&
    smoke.includes("Secret value is intentionally not printed."),
  "generic connection nextAction must be safe and must not print the database URL",
);
assert(
  smoke.includes("result.missingMedusaTables = []") &&
    smoke.includes("result.medusaTableQueryRan = false") &&
    smoke.includes("result.likelyWrongDatabase = false"),
  "connection failures must not masquerade as missing tables or wrong-database proof before any table query runs",
);
assert(
  !/console\.(?:log|error|warn)\([^)]*(?:process\.env\.(?:DATABASE_URL|MEDUSA_DATABASE_URL)|medusaDatabaseUrl|genericDatabaseUrl|databaseUrl|connectionString)/s.test(
    smoke,
  ),
  "EAI_AGAIN diagnostics must not print DB URL variables or connection strings",
);

console.log(
  JSON.stringify(
    { success: true, smoke: "medusa_db_eai_again_diagnostics" },
    null,
    2,
  ),
);
