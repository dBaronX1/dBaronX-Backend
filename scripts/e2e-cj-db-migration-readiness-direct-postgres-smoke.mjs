import fs from 'node:fs';

const sourcePath = 'apps/api/src/modules/suppliers/cj-import/cj-product-import.service.ts';
const txt = fs.readFileSync(sourcePath, 'utf8');

const mustInclude = [
  "process.env.DATABASE_URL",
  "checkerSource: 'database_url_postgres_to_regclass'",
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
];
for (const token of mustInclude) {
  if (!txt.includes(token)) throw new Error(`missing required readiness token: ${token}`);
}

const mustNotInclude = [
  ".from(\"cj_product_import_runs\").select(\"id\").limit(1)",
  ".from(\"cj_product_import_items\").select(\"id\").limit(1)",
  ".from(\"storefront_products\").select(\"id\").limit(1)",
  ".from(\"fulfillment_tasks\").select(\"id\").limit(1)",
  "console.log(process.env.DATABASE_URL)",
  "console.log(databaseUrl)",
];
for (const token of mustNotInclude) {
  if (txt.includes(token)) throw new Error(`forbidden readiness pattern: ${token}`);
}

console.log('ok cj db migration readiness direct postgres smoke');
