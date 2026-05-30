#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";

const requireFromSmoke = createRequire(import.meta.url);

const REQUIRED_MEDUSA_TABLES = Object.freeze([
  "product",
  "product_variant",
  "region",
  "currency",
  "tax_provider",
  "payment_provider",
  "fulfillment_provider",
  "shipping_option",
  "sales_channel",
  "stock_location",
]);
const OUTPUT_PATH =
  process.env.DBX_MEDUSA_DB_CONTRACT_OUTPUT_PATH ||
  "artifacts/medusa-db-contract.json";

const result = {
  success: false,
  medusaDatabaseUrlPresent: false,
  databaseUrlPresent: false,
  usingMedusaDatabaseSecret: true,
  usingGenericDatabaseSecret: false,
  databaseUrlEqualsMedusaDatabaseUrl: false,
  secretSourceHint: "MEDUSA_DATABASE_URL",
  medusaWorkflowDatabaseContract:
    "DATABASE_URL_AND_MEDUSA_DATABASE_URL_BOTH_FROM_MEDUSA_DATABASE_URL_SECRET",
  medusaDatabaseConnected: false,
  medusaCoreTablesReady: false,
  missingMedusaTables: [],
  medusaTableQueryRan: false,
  likelyWrongDatabase: false,
  apiSupabaseStagingTablePresent: false,
  errorCode: null,
  connectionFailureKind: null,
  connectionErrorCode: null,
  nextAction:
    "Set MEDUSA_DATABASE_URL to the Medusa Postgres database URL; do not use the API/NestJS Supabase DATABASE_URL.",
};

function emit(exitCode) {
  const safe = JSON.stringify(result, null, 2);
  try {
    mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
    writeFileSync(OUTPUT_PATH, `${safe}\n`, "utf8");
  } catch {}
  console.log(safe);
  process.exit(exitCode);
}

function safePgLoadError(candidate, error) {
  const code = typeof error?.code === "string" ? error.code : null;
  const name = error?.name || "Error";
  if (code === "MODULE_NOT_FOUND" || code === "ERR_MODULE_NOT_FOUND") {
    return `${candidate}:${code}`;
  }
  return `${candidate}:${name}`;
}

function loadPgClient() {
  const candidates = [
    "pg",
    "../apps/api/node_modules/pg",
    "../apps/medusa/node_modules/pg",
  ];
  const errors = [];
  for (const candidate of candidates) {
    try {
      const mod = requireFromSmoke(candidate);
      const Client = mod?.Client || mod?.default?.Client;
      if (Client) return Client;
      errors.push(`${candidate}:missing_Client_export`);
    } catch (error) {
      errors.push(safePgLoadError(candidate, error));
    }
  }
  result.errorCode = "pg_client_unavailable";
  result.nextAction =
    "Run pnpm install --frozen-lockfile before this smoke so the workspace pg dependency is available.";
  result.pgLoadDiagnostics = errors;
  emit(1);
}

const medusaDatabaseUrl = String(process.env.MEDUSA_DATABASE_URL || "").trim();
const genericDatabaseUrl = String(process.env.DATABASE_URL || "").trim();
const databaseUrl = medusaDatabaseUrl;
result.medusaDatabaseUrlPresent = Boolean(medusaDatabaseUrl);
result.databaseUrlPresent = Boolean(genericDatabaseUrl);
result.databaseUrlEqualsMedusaDatabaseUrl = Boolean(
  medusaDatabaseUrl &&
    genericDatabaseUrl &&
    medusaDatabaseUrl === genericDatabaseUrl,
);

if (!medusaDatabaseUrl) {
  result.errorCode = "medusa_database_url_missing";
  result.nextAction =
    "Create the GitHub repository secret MEDUSA_DATABASE_URL with the real Medusa database URL, update any GitHub Environment secret MEDUSA_DATABASE_URL if this workflow uses an Environment, then rerun the Medusa workflow.";
  emit(1);
}
const Client = loadPgClient();
const client = new Client({
  connectionString: databaseUrl,
  connectionTimeoutMillis: 10000,
});
try {
  await client.connect();
  result.medusaDatabaseConnected = true;
  const tableRows = await client.query(
    `select table_name, to_regclass('public.' || table_name) is not null as exists from unnest($1::text[]) as table_name`,
    [REQUIRED_MEDUSA_TABLES],
  );
  result.medusaTableQueryRan = true;
  const existsByTable = Object.fromEntries(
    tableRows.rows.map((row) => [row.table_name, row.exists === true]),
  );
  result.missingMedusaTables = REQUIRED_MEDUSA_TABLES.filter(
    (table) => !existsByTable[table],
  );
  result.medusaCoreTablesReady = result.missingMedusaTables.length === 0;

  const apiStaging = await client.query(
    `select to_regclass('app_private.cj_product_import_runs') is not null as exists`,
  );
  result.apiSupabaseStagingTablePresent = apiStaging.rows?.[0]?.exists === true;
  const anyMedusaTablePresent = REQUIRED_MEDUSA_TABLES.some(
    (table) => existsByTable[table],
  );
  result.likelyWrongDatabase = Boolean(
    result.apiSupabaseStagingTablePresent && !anyMedusaTablePresent,
  );

  if (result.likelyWrongDatabase) {
    result.errorCode = "using_api_supabase_db_instead_of_medusa_db";
    result.nextAction =
      "Replace MEDUSA_DATABASE_URL with the Medusa Postgres database URL. The API/NestJS Supabase DATABASE_URL is only for CJ staging/business tables.";
    emit(1);
  }
  if (!result.medusaCoreTablesReady) {
    result.errorCode = "wrong_database_or_medusa_migrations_missing";
    result.nextAction =
      "Run Medusa migrations against MEDUSA_DATABASE_URL, or correct MEDUSA_DATABASE_URL if this is not the Medusa database.";
    emit(1);
  }

  result.success = true;
  result.nextAction =
    "Medusa database contract is ready; continue with the controlled first CJ product seed.";
  emit(0);
} catch (error) {
  const safeCode =
    typeof error?.code === "string" && /^[A-Za-z0-9_]+$/.test(error.code)
      ? error.code
      : null;
  result.connectionErrorName = error?.name || "Error";
  result.connectionErrorCode = safeCode;
  result.missingMedusaTables = [];
  result.medusaTableQueryRan = false;
  result.likelyWrongDatabase = false;
  if (safeCode === "28000") {
    result.errorCode = "medusa_database_auth_failed";
    result.connectionFailureKind = "auth_failed";
    result.nextAction =
      "Postgres rejected the MEDUSA_DATABASE_URL credentials. Re-copy the full current Render Postgres External Database URL using the Render copy button. Update GitHub repository secret MEDUSA_DATABASE_URL and any GitHub Environment secret MEDUSA_DATABASE_URL, especially Production. If the Render DB password was rotated, old URLs will fail.";
  } else {
    result.errorCode = "medusa_database_connection_failed";
    result.connectionFailureKind = "connection_failed";
    result.nextAction =
      "Verify MEDUSA_DATABASE_URL is reachable from GitHub Actions and points to the Medusa database. Secret value is intentionally not printed.";
  }
  emit(1);
} finally {
  try {
    await client.end();
  } catch {}
}
