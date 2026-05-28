import fs from 'node:fs';

const readinessPath = 'apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts';
const operatorPath = 'apps/api/src/scripts/cj-operator-onboard-products.ts';
const readiness = fs.readFileSync(readinessPath, 'utf8');
const operator = fs.readFileSync(operatorPath, 'utf8');
const combined = `${readiness}\n${operator}`;

const mustInclude = [
  "checkerSource: DB_READINESS_CHECKER_SOURCE",
  "const DB_READINESS_CHECKER_SOURCE = 'database_url_pg_client_to_regclass'",
  "new Client({",
  "connectionString: databaseUrl",
  "ssl: { rejectUnauthorized: false }",
  "connectionTimeoutMillis: 15000",
  "to_regclass('app_private.cj_product_import_runs') is not null",
  "to_regclass('app_private.cj_product_import_items') is not null",
  "to_regclass('app_public.storefront_products') is not null",
  "to_regclass('app_private.fulfillment_tasks') is not null",
  "sanitizeDbError(error)",
  "connectionFailureKind",
  "secretLeakDetected: false",
  "Use Supabase pooler/IPv4-compatible DATABASE_URL in GitHub Actions",
  "sanitizeSecretText(outputPath)",
];

for (const token of mustInclude) {
  if (!combined.includes(token)) throw new Error(`missing redaction/readiness token: ${token}`);
}

const forbidden = [
  "execFileSync('psql'",
  'execFileSync("psql"',
  'psql ${DATABASE_URL}',
  'psql ${databaseUrl}',
  'console.log(process.env.DATABASE_URL)',
  'console.log(databaseUrl)',
  'error.message ||',
  'error.stack',
];
for (const token of forbidden) {
  if (readiness.includes(token)) throw new Error(`forbidden readiness secret leak pattern: ${token}`);
}

if (/errorMessage\s*=\s*.*postgres(?:ql)?:\/\//i.test(combined)) {
  throw new Error('errorMessage must not include postgres:// or postgresql://');
}

const connectionFailedIndex = readiness.indexOf("blockers.push('database_connection_failed')");
const tableMissingBlockIndex = readiness.indexOf('if (dbDiagnostics.databaseConnected)');
if (connectionFailedIndex < 0 || tableMissingBlockIndex < 0 || tableMissingBlockIndex < connectionFailedIndex) {
  throw new Error('table-missing blockers must be gated behind databaseConnected after connection failures are handled');
}

const tableMissingBlock = readiness.slice(tableMissingBlockIndex, readiness.indexOf('if (\n      dbDiagnostics.databaseConnected', tableMissingBlockIndex));
for (const blocker of [
  'cj_import_runs_table_missing',
  'cj_import_items_table_missing',
  'storefront_products_table_missing',
  'fulfillment_tasks_table_missing',
]) {
  if (!tableMissingBlock.includes(blocker)) throw new Error(`missing gated table blocker: ${blocker}`);
}

const rawUrlPattern = /postgres(?:ql)?:\/\/[^\s"'<>]*:[^\s"'<>]*@/i;
if (rawUrlPattern.test(combined)) throw new Error('source contains raw postgres URL with credentials');

console.log('ok cj db readiness redaction smoke');
