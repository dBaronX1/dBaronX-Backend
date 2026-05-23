import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CjProductImportService } from '../modules/suppliers/cj-import/cj-product-import.service';
import { CjProductPublishService } from '../modules/suppliers/cj-import/cj-product-publish.service';
import { CJ_PRODUCT_CATEGORIES, CjCategorySlug } from '../modules/suppliers/cj-import/cj-product-categories';
import { SupabaseService } from '../shared/services/supabase.service';

type Mode = 'readiness'|'preview'|'import'|'auto-approve-safe'|'publish-approved'|'onboard-category'|'onboard-batch';
type CategoryResult = { category: string; previewed: number; imported: number; accepted: number; rejected: number; autoApproved: number; published: number; skipped: number; blockers: string[] };

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
    if (!readiness.checks?.migrationReady) blockers.push('migration_missing');
    if (!readiness.checks?.storefrontPublishTargetReady) blockers.push('storefront_publish_target_missing');
    if (!readiness.checks?.categoryMapperReady) blockers.push('category_mapper_missing');
    if (!readiness.checks?.cjCredentialsConfigured) blockers.push('cj_credentials_missing');

    if (mode === 'readiness' || blockers.length > 0) {
      console.log(JSON.stringify({ success: blockers.length === 0, mode, categories, blockers: Array.from(new Set(blockers)), results, nextAction: blockers.length ? 'Resolve blockers before import/publish.' : 'Ready for operator onboarding.' }, null, 2));
      process.exitCode = blockers.length ? 1 : 0;
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

    console.log(JSON.stringify({ success: results.every((r) => r.blockers.length === 0), mode, categories, blockers: Array.from(new Set(blockers)), results, nextAction: 'Review summary and rerun as needed.' }, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.log(JSON.stringify({ success: false, mode: process.env.CJ_OPERATOR_MODE || 'readiness', categories: parseCategories(), blockers: [String(error?.message || error)], results: [], nextAction: 'Fix runtime error and retry.' }, null, 2));
  process.exit(1);
});
