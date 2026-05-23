import fs from 'node:fs';

const p = 'apps/api/src/scripts/cj-operator-onboard-products.ts';
if (!fs.existsSync(p)) throw new Error('operator script missing');
const txt = fs.readFileSync(p, 'utf8');

const must = [
  'current_database() as database_name',
  'current_user as database_user',
  "to_regclass('app_private.cj_product_import_runs')",
  "to_regclass('app_private.cj_product_import_items')",
  "to_regclass('app_public.storefront_products')",
  "to_regclass('app_private.fulfillment_tasks')",
  'requiredTables',
  'missingTables',
  'db_connection_failed',
  'db_env_missing',
  'wrong_database_or_migration_not_applied',
  'cj_import_runs_table_missing',
  'cj_import_items_table_missing',
  'storefront_products_table_missing',
  'fulfillment_tasks_table_missing',
  'db_permission_denied',
  'migration_check_failed',
  "mode === 'readiness'",
  "if (mode === 'readiness' || blockerSet.length > 0)",
];
for (const k of must) if (!txt.includes(k)) throw new Error(`missing ${k}`);

const forbidden = ['DATABASE_URL', 'postgres://', 'postgresql://', 'SUPABASE_SERVICE_ROLE_KEY='];
for (const f of forbidden) if (txt.includes(f)) throw new Error(`forbidden output pattern present: ${f}`);

if (!txt.includes('legacyBlockers')) throw new Error('legacy blocker compatibility field missing');

console.log('ok cj operator db readiness smoke');
