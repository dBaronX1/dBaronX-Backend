import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CjProductImportService } from '../modules/suppliers/cj-import/cj-product-import.service';
import { CjProductPublishService } from '../modules/suppliers/cj-import/cj-product-publish.service';
import { CJ_PRODUCT_CATEGORIES, CjCategorySlug } from '../modules/suppliers/cj-import/cj-product-categories';
import { SupabaseService } from '../shared/services/supabase.service';

type Mode = 'readiness'|'preview'|'import'|'auto-approve-safe'|'publish-approved'|'onboard-category'|'onboard-batch';
type CategoryResult = { category: string; previewed: number; imported: number; accepted: number; rejected: number; autoApproved: number; published: number; skipped: number; blockers: string[] };
type DbDiagnostics = {
  databaseName: string | null;
  databaseUser: string | null;
  requiredTables: {
    cjProductImportRuns: boolean;
    cjProductImportItems: boolean;
    storefrontProducts: boolean;
    fulfillmentTasks: boolean;
  };
  missingTables: string[];
  dbConnectionReady: boolean;
  dbDiagnosticAvailable: boolean;
};

const HARD_MAX_PER_CATEGORY = 100;
const DEFAULT_LIMIT_PER_CATEGORY = 20;
const ONBOARD_MODES: Mode[] = ['onboard-category', 'onboard-batch'];

function parseLimit(value: string | undefined, fallback: number) { const n = Number(value || fallback); return !Number.isFinite(n) || n < 1 ? fallback : Math.min(Math.floor(n), HARD_MAX_PER_CATEGORY); }
function parseCategories(): CjCategorySlug[] {
  const single = process.env.CJ_OPERATOR_CATEGORY?.trim();
  const multi = (process.env.CJ_OPERATOR_CATEGORIES || '').split(',').map((s) => s.trim()).filter(Boolean);
  const raw = [...(single ? [single] : []), ...multi];
  const unique = Array.from(new Set(raw.length ? raw : ['fashion']));
  return unique.filter((c): c is CjCategorySlug => c in CJ_PRODUCT_CATEGORIES);
}

async function loadDbDiagnostics(supabase: SupabaseService): Promise<{ diagnostics: DbDiagnostics; blockers: string[] }> {
  const diagnostics: DbDiagnostics = {
    databaseName: null,
    databaseUser: null,
    requiredTables: {
      cjProductImportRuns: false,
      cjProductImportItems: false,
      storefrontProducts: false,
      fulfillmentTasks: false,
    },
    missingTables: [],
    dbConnectionReady: false,
    dbDiagnosticAvailable: false,
  };
  const blockers: string[] = [];

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    blockers.push('db_env_missing');
    return { diagnostics, blockers };
  }

  let probe: { data: any; error: any };
  try {
    probe = await supabase.getClient().rpc('exec_sql', {
      query: `select
        current_database() as database_name,
        current_user as database_user,
        to_regclass('app_private.cj_product_import_runs') as cj_product_import_runs,
        to_regclass('app_private.cj_product_import_items') as cj_product_import_items,
        to_regclass('app_public.storefront_products') as storefront_products,
        to_regclass('app_private.fulfillment_tasks') as fulfillment_tasks`,
    });
  } catch (error) {
    const msg = String((error as Error)?.message || '').toLowerCase();
    if (msg.includes('permission denied') || msg.includes('insufficient_privilege')) blockers.push('db_permission_denied');
    else blockers.push('db_connection_failed');
    blockers.push('migration_check_failed');
    return { diagnostics, blockers };
  }

  if (probe.error) {
    const msg = String(probe.error.message || '').toLowerCase();
    if (msg.includes('permission denied') || msg.includes('insufficient_privilege')) blockers.push('db_permission_denied');
    else blockers.push('db_connection_failed');
    blockers.push('migration_check_failed');
    return { diagnostics, blockers };
  }

  const row = Array.isArray(probe.data) ? probe.data[0] : probe.data;
  diagnostics.dbDiagnosticAvailable = Boolean(row);
  diagnostics.dbConnectionReady = Boolean(row);
  diagnostics.databaseName = row?.database_name ?? null;
  diagnostics.databaseUser = row?.database_user ?? null;
  diagnostics.requiredTables.cjProductImportRuns = Boolean(row?.cj_product_import_runs);
  diagnostics.requiredTables.cjProductImportItems = Boolean(row?.cj_product_import_items);
  diagnostics.requiredTables.storefrontProducts = Boolean(row?.storefront_products);
  diagnostics.requiredTables.fulfillmentTasks = Boolean(row?.fulfillment_tasks);

  if (!diagnostics.requiredTables.cjProductImportRuns) diagnostics.missingTables.push('app_private.cj_product_import_runs');
  if (!diagnostics.requiredTables.cjProductImportItems) diagnostics.missingTables.push('app_private.cj_product_import_items');
  if (!diagnostics.requiredTables.storefrontProducts) diagnostics.missingTables.push('app_public.storefront_products');
  if (!diagnostics.requiredTables.fulfillmentTasks) diagnostics.missingTables.push('app_private.fulfillment_tasks');

  if (!diagnostics.requiredTables.cjProductImportRuns) blockers.push('cj_import_runs_table_missing');
  if (!diagnostics.requiredTables.cjProductImportItems) blockers.push('cj_import_items_table_missing');
  if (!diagnostics.requiredTables.storefrontProducts) blockers.push('storefront_products_table_missing');
  if (!diagnostics.requiredTables.fulfillmentTasks) blockers.push('fulfillment_tasks_table_missing');

  if (diagnostics.missingTables.length > 0) blockers.push('wrong_database_or_migration_not_applied');

  return { diagnostics, blockers };
}

async function main() {
  const mode = (process.env.CJ_OPERATOR_MODE || 'readiness') as Mode;
  const categories = parseCategories();
  const limit = parseLimit(process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY || process.env.CJ_OPERATOR_LIMIT, DEFAULT_LIMIT_PER_CATEGORY);
  const confirmation = process.env.DBX_CONFIRM_CJ_OPERATOR_ONBOARDING === 'true';
  const blockers: string[] = [];
  const results: CategoryResult[] = categories.map((category) => ({ category, previewed: 0, imported: 0, accepted: 0, rejected: 0, autoApproved: 0, published: 0, skipped: 0, blockers: [] }));

  if (!confirmation && mode !== 'readiness') {
    console.log(JSON.stringify({ success: false, mode, categories, blockers: ['operator_confirmation_missing'], results, nextAction: 'Set DBX_CONFIRM_CJ_OPERATOR_ONBOARDING=true and retry.' }, null, 2));
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const importer = app.get(CjProductImportService, { strict: false });
    const publisher = app.get(CjProductPublishService, { strict: false });
    const supabase = app.get(SupabaseService, { strict: false });

    if (!publisher) blockers.push('publish_service_missing');
    if (!importer) blockers.push('category_mapper_missing');

    const readiness = await importer.readiness();
    blockers.push(...readiness.blockers);
    if (!readiness.checks?.storefrontPublishTargetReady) blockers.push('storefront_publish_target_missing');
    if (!readiness.checks?.categoryMapperReady) blockers.push('category_mapper_missing');
    if (!readiness.checks?.cjCredentialsConfigured) blockers.push('cj_credentials_missing');

    const { diagnostics, blockers: dbBlockers } = await loadDbDiagnostics(supabase);
    blockers.push(...dbBlockers);

    const blockerSet = Array.from(new Set(blockers));
    const legacyBlockers = blockerSet.length > 0 ? ['migration_missing'] : [];

    if (mode === 'readiness' || blockerSet.length > 0) {
      console.log(JSON.stringify({ success: blockerSet.length === 0, mode, categories, blockers: blockerSet, legacyBlockers, dbDiagnostics: diagnostics, results, nextAction: blockerSet.length ? 'Resolve blockers before import/publish.' : 'Ready for operator onboarding.' }, null, 2));
      process.exitCode = blockerSet.length ? 1 : 0;
      return;
    }

    const autoApproveSafe = process.env.CJ_OPERATOR_AUTO_APPROVE_SAFE === 'true' || ONBOARD_MODES.includes(mode);
    const publishApproved = process.env.CJ_OPERATOR_PUBLISH_APPROVED === 'true' || ONBOARD_MODES.includes(mode);

    for (const result of results) {
      if (['preview', ...ONBOARD_MODES].includes(mode)) {
        const preview = await importer.preview(result.category, limit);
        result.previewed = preview.items?.length || 0;
      }
      if (['import', ...ONBOARD_MODES].includes(mode)) {
        const imported = await importer.runImport(result.category, limit, 'cj_operator');
        result.imported = imported.imported || 0;
        result.accepted = imported.accepted || 0;
        result.rejected = imported.rejected || 0;
      }
      if (mode === 'auto-approve-safe' || autoApproveSafe) {
        const { data, error } = await supabase.schema('app_private').from('cj_product_import_items').select('*').eq('supplier', 'cj').eq('approval_status', 'pending_admin_approval').limit(HARD_MAX_PER_CATEGORY);
        if (error) {
          result.blockers.push(error.message);
        } else {
          for (const item of data || []) {
            const validationOk = ['validated', 'accepted', 'valid'].includes(item.validation_status);
            const pending = item.approval_status === 'pending_admin_approval';
            const blockersClear = !Array.isArray(item.blockers) || item.blockers.length === 0;
            const restrictedRisk = Array.isArray(item.blockers) && item.blockers.some((b: string) => String(b).includes('restricted'));
            const hasPrice = Number(item.price_minor) > 0;
            const hasImage = Boolean(item.image_url);
            const stockOk = item.checkout_enabled ? Number(item.stock_qty) > 0 : true;
            const supplierOk = item.supplier === 'cj';
            const supplierProductIdOk = Boolean(item.supplier_product_id);
            if (validationOk && pending && blockersClear && !restrictedRisk && hasPrice && hasImage && stockOk && supplierOk && supplierProductIdOk) {
              await publisher.approve(item.id);
              result.autoApproved += 1;
            } else {
              result.skipped += 1;
            }
          }
        }
      }
      if (mode === 'publish-approved' || publishApproved) {
        const published = await publisher.publishApproved();
        result.published += published.published || 0;
      }
    }

    console.log(JSON.stringify({ success: results.every((r) => r.blockers.length === 0), mode, categories, blockers: blockerSet, legacyBlockers, dbDiagnostics: diagnostics, results, nextAction: 'Review summary and rerun as needed.' }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.log(JSON.stringify({ success: false, mode: process.env.CJ_OPERATOR_MODE || 'readiness', categories: parseCategories(), blockers: [String(error?.message || error)], results: [], nextAction: 'Fix runtime error and retry.' }, null, 2));
  process.exit(1);
});
