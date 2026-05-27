import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CjProductImportService } from '../modules/suppliers/cj-import/cj-product-import.service';
import { CjProductPublishService } from '../modules/suppliers/cj-import/cj-product-publish.service';
import { CJ_OPERATOR_ALL_CATEGORY_SET, CJ_PRODUCT_CATEGORIES, CjCategorySlug } from '../modules/suppliers/cj-import/cj-product-categories';
import { SupabaseService } from '../shared/services/supabase.service';

type Mode = 'readiness'|'preview'|'import'|'approve-safe'|'auto-approve-safe'|'publish-approved'|'full-safe';
type CategoryResult = { category: string; requested: number; fetched: number; previewed: number; staged: number; valid: number; rejected: number; approved: number; published: number; skipped: number; blockers: string[]; labelsFound: string[]; duplicateCount: number; restrictedRejectedCount: number; partialReason: string | null };
const HARD_MAX_PER_CATEGORY = 200;
const DEFAULT_LIMIT_PER_CATEGORY = 50;

function parseLimit(value: string | undefined, fallback: number) { const n = Number(value || fallback); return !Number.isFinite(n) || n < 1 ? fallback : Math.min(Math.floor(n), HARD_MAX_PER_CATEGORY); }
function isTrue(value: string | undefined): boolean { return String(value || '').toLowerCase() === 'true'; }
function parseCategories(): CjCategorySlug[] {
  const c = (process.env.CJ_OPERATOR_CATEGORY || 'all').trim();
  if (c === 'all') return [...CJ_OPERATOR_ALL_CATEGORY_SET];
  return c in CJ_PRODUCT_CATEGORIES && c !== 'all' ? [c as CjCategorySlug] : [...CJ_OPERATOR_ALL_CATEGORY_SET];
}

async function main() {
  const mode = (process.env.CJ_OPERATOR_MODE || 'readiness') as Mode;
  const dryRun = isTrue(process.env.CJ_OPERATOR_DRY_RUN);
  const requested = parseLimit(process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY, DEFAULT_LIMIT_PER_CATEGORY);
  const categories = parseCategories();

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const importer = app.get(CjProductImportService, { strict: false });
    const publisher = app.get(CjProductPublishService, { strict: false });
    const supabase = app.get(SupabaseService, { strict: false });
    const readiness = await importer.readiness();
    const blockers = [...new Set(readiness.blockers || [])];

    const result: { success:boolean; mode: string; dryRun:boolean; requestedLimitPerCategory:number; totalCategories:number; categoryResults:CategoryResult[]; totalPreviewed:number; totalFetched:number; totalStaged:number; totalApproved:number; totalPublished:number; totalRejected:number; totalSkipped:number; blockers:string[]; missingSecrets:string[]; dbDiagnostics:any; cjDiagnostics:any; nextAction:string } = {
      success: false, mode, dryRun, requestedLimitPerCategory: requested, totalCategories: categories.length, categoryResults: [],
      totalPreviewed:0,totalFetched:0,totalStaged:0,totalApproved:0,totalPublished:0,totalRejected:0,totalSkipped:0,blockers,missingSecrets:[],
      dbDiagnostics: { migrationReady: readiness.checks?.migrationReady ?? false }, cjDiagnostics: { cjCredentialsConfigured: readiness.checks?.cjCredentialsConfigured ?? false }, nextAction:'Resolve blockers and retry.'
    };

    if (mode === 'readiness' || blockers.length > 0) {
      result.success = blockers.length === 0;
      result.nextAction = blockers.length ? 'Resolve readiness blockers then run preview/import.' : 'Run preview or full-safe.';
      console.log(JSON.stringify(result, null, 2));
      process.exitCode = result.success || isTrue(process.env.CJ_OPERATOR_READINESS_EXIT_ZERO) ? 0 : 1;
      return;
    }

    for (const category of categories) {
      const row: CategoryResult = { category, requested, fetched:0, previewed:0, staged:0, valid:0, rejected:0, approved:0, published:0, skipped:0, blockers:[], labelsFound:[], duplicateCount:0, restrictedRejectedCount:0, partialReason: null };
      if (mode === 'preview' || mode === 'import' || mode === 'full-safe') {
        const preview = await importer.preview(category, requested);
        const labels = new Set<string>();
        for (const item of preview.items || []) { row.fetched += 1; row.previewed += 1; labels.add(String(item.category_slug || item.category || 'unknown')); }
        row.partialReason = typeof (preview as any).partialReason === "string" ? (preview as any).partialReason : null;
        row.labelsFound = [...labels];
      }
      if (!dryRun && (mode === 'import' || mode === 'full-safe')) {
        const imported = await importer.runImport(category, requested, 'cj_operator');
        row.staged = imported.imported || 0; row.valid = imported.accepted || 0; row.rejected = imported.rejected || 0;
      }
      if (!dryRun && (mode === 'approve-safe' || mode === 'auto-approve-safe' || mode === 'full-safe')) {
        const { data } = await supabase.schema('app_private').from('cj_product_import_items').select('id,validation_status,approval_status,blockers,category_slug').eq('supplier','cj').eq('category_slug',category).eq('approval_status','pending_admin_approval').limit(requested);
        for (const item of data || []) {
          const ok = item.validation_status === 'validated' && (!Array.isArray(item.blockers) || item.blockers.length===0);
          if (ok) { await publisher.approve(item.id); row.approved += 1; } else { row.skipped += 1; }
        }
      }
      if (!dryRun && (mode === 'publish-approved' || mode === 'full-safe')) {
        const p = await publisher.publishApproved();
        row.published += p.published || 0;
      }
      result.categoryResults.push(row);
      result.totalPreviewed += row.previewed; result.totalFetched += row.fetched; result.totalStaged += row.staged; result.totalApproved += row.approved; result.totalPublished += row.published; result.totalRejected += row.rejected; result.totalSkipped += row.skipped;
    }

    result.success = result.categoryResults.every((r) => r.blockers.length === 0);
    result.nextAction = result.success ? 'Review artifact and rerun publish-approved if needed.' : 'Inspect blockers.';
    console.log(JSON.stringify(result, null, 2));
  } finally { await app.close(); }
}

main().catch((error) => {
  console.log(JSON.stringify({ success:false, mode: process.env.CJ_OPERATOR_MODE || 'readiness', dryRun:isTrue(process.env.CJ_OPERATOR_DRY_RUN), requestedLimitPerCategory: parseLimit(process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY, DEFAULT_LIMIT_PER_CATEGORY), totalCategories:0, categoryResults:[], totalPreviewed:0,totalFetched:0,totalStaged:0,totalApproved:0,totalPublished:0,totalRejected:0,totalSkipped:0, blockers:[String(error?.message || error)], missingSecrets:[], dbDiagnostics:{}, cjDiagnostics:{}, nextAction:'Fix runtime error and retry.' }, null, 2));
  process.exit(1);
});
