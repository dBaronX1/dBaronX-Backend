import { readFileSync } from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const smoke = readFileSync(
  "scripts/e2e-medusa-database-contract-smoke.mjs",
  "utf8",
);
const publishableWorkflow = readFileSync(
  ".github/workflows/medusa-publishable-key.yml",
  "utf8",
);
const seedWorkflow = readFileSync(
  ".github/workflows/medusa-first-product-seed.yml",
  "utf8",
);
const combined = `${smoke}\n${publishableWorkflow}\n${seedWorkflow}`;

assert(smoke.includes(`safeCode === "28000"`), "SQLSTATE 28000 branch missing");
assert(
  smoke.includes(`result.errorCode = "medusa_database_auth_failed"`),
  "28000 must map to medusa_database_auth_failed",
);
assert(
  smoke.includes(`result.connectionFailureKind = "auth_failed"`),
  "28000 must set connectionFailureKind=auth_failed",
);
assert(
  smoke.includes(
    "Update GitHub Actions MEDUSA_DATABASE_URL with the current Render Postgres External Database URL after any password rotation. Do not use API Supabase DATABASE_URL.",
  ),
  "auth nextAction must mention MEDUSA_DATABASE_URL and Render Postgres External Database URL",
);
assert(
  smoke.includes("result.missingMedusaTables = []") &&
    smoke.includes("result.medusaTableQueryRan = false"),
  "connection failures must not list missing tables and must keep table query false",
);
assert(
  smoke.includes("result.likelyWrongDatabase = false"),
  "likelyWrongDatabase must stay false until a connected table query proves it",
);
assert(
  !smoke.includes("medusaDatabaseUrl || genericDatabaseUrl"),
  "Medusa DB smoke must not fall back to generic DATABASE_URL",
);
assert(
  !/secrets\.DATABASE_URL/.test(combined),
  "Medusa workflows must not fall back to secrets.DATABASE_URL",
);

const forbidden = [
  /postgres(?:ql)?:\/\//i,
  /host(name)?\s*[:=]/i,
  /user(name)?\s*[:=]/i,
  /password\s*[:=]/i,
  /database\s*name\s*[:=]/i,
];
for (const pattern of forbidden) {
  assert(
    !pattern.test(smoke),
    `diagnostic smoke source contains unsafe URL/host/user/password/db-name pattern: ${pattern}`,
  );
}

console.log(
  JSON.stringify(
    { success: true, smoke: "medusa_db_auth_diagnostics" },
    null,
    2,
  ),
);
