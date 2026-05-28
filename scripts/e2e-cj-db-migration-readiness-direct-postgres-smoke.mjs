import fs from 'node:fs';

const sourcePath = 'apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts';
const txt = fs.readFileSync(sourcePath, 'utf8');

const mustInclude = [
  "process.env.DATABASE_URL",
  "import { Client } from \"pg\";",
  "const DB_READINESS_CHECKER_SOURCE = 'database_url_pg_client_to_regclass'",
  "checkerSource: DB_READINESS_CHECKER_SOURCE",
  "connectionString: databaseUrl",
  "ssl: { rejectUnauthorized: false }",
  "to_regclass('app_private.cj_product_import_runs') is not null",
  "to_regclass('app_private.cj_product_import_items') is not null",
  "to_regclass('app_public.storefront_products') is not null",
  "to_regclass('app_private.fulfillment_tasks') is not null",
  "requiredTables['app_private.cj_product_import_runs']",
  "requiredTables['app_private.cj_product_import_items']",
  "requiredTables['app_public.storefront_products']",
  "requiredTables['app_private.fulfillment_tasks']",
  "database_url_missing",
  "database_connection_failed",
  "likelySupabaseRestSchemaVisibilityIssue",
  "sanitizeDbError(error)",
  "Database connection failed. Verify GitHub Actions DATABASE_URL uses the Supabase pooler/IPv4-compatible connection string",
  "secretLeakDetected: false",
];
for (const token of mustInclude) {
  if (!txt.includes(token)) throw new Error(`missing required readiness token: ${token}`);
}

const mustNotInclude = [
  "execFileSync('psql'",
  'execFileSync("psql"',
  "database_url_postgres_to_regclass",
  ".from(\"cj_product_import_runs\").select(\"id\").limit(1)",
  ".from(\"cj_product_import_items\").select(\"id\").limit(1)",
  ".from(\"storefront_products\").select(\"id\").limit(1)",
  ".from(\"fulfillment_tasks\").select(\"id\").limit(1)",
  "console.log(process.env.DATABASE_URL)",
  "console.log(databaseUrl)",
  "errorMessage = error instanceof Error ? String(error.message",
];
for (const token of mustNotInclude) {
  if (txt.includes(token)) throw new Error(`forbidden readiness pattern: ${token}`);
}

if (/postgres(?:ql)?:\/\/[^\s"'<>]*:[^\s"'<>]*@/i.test(txt)) {
  throw new Error('readiness source contains raw postgres URL with credentials');
}

console.log('ok cj db migration readiness direct postgres smoke');
