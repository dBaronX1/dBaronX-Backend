import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
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
const outputPath = process.env.CJ_OPERATOR_OUTPUT_PATH;

function parseLimit(value: string | undefined, fallback: number) { const n = Number(value || fallback); return !Number.isFinite(n) || n < 1 ? fallback : Math.min(Math.floor(n), HARD_MAX_PER_CATEGORY); }
function isTrue(value: string | undefined): boolean { return String(value || '').toLowerCase() === 'true'; }
function parseCategories(): CjCategorySlug[] { const c = (process.env.CJ_OPERATOR_CATEGORY || 'all').trim(); return c === 'all' ? [...CJ_OPERATOR_ALL_CATEGORY_SET] : c in CJ_PRODUCT_CATEGORIES && c !== 'all' ? [c as CjCategorySlug] : [...CJ_OPERATOR_ALL_CATEGORY_SET]; }
function sanitizeStack(error: unknown): string[] { const stack = (error instanceof Error ? error.stack : String(error || '')).split('\n').slice(0, 8).map((l) => l.replace(/(token|key|secret|password)=\S+/ig, '$1=[redacted]')); return stack; }
function emit(payload: any) { const content = `${JSON.stringify(payload, null, 2)}\n`; console.log(content); if (outputPath) { mkdirSync(dirname(outputPath), { recursive: true }); writeFileSync(outputPath, content, 'utf8'); } }

async function main() {
  const mode = (process.env.CJ_OPERATOR_MODE || 'readiness') as Mode;
  const dryRun = isTrue(process.env.CJ_OPERATOR_DRY_RUN);
  const requested = parseLimit(process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY, DEFAULT_LIMIT_PER_CATEGORY);
  const categories = parseCategories();
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  try {
    const importer = app.get(CjProductImportService, { strict: false }); const publisher = app.get(CjProductPublishService, { strict: false }); const supabase = app.get(SupabaseService, { strict: false });
    const readiness = await importer.readiness(); const blockers = [...new Set(readiness.blockers || [])];
    const result: any = { success: false, mode, dryRun, requestedLimitPerCategory: requested, totalCategories: categories.length, categoryResults: [], totalPreviewed:0,totalFetched:0,totalStaged:0,totalApproved:0,totalPublished:0,totalRejected:0,totalSkipped:0,totalMedusaSynced:0, blockers,medusaSyncBlockers:[], missingSecrets:[], dbDiagnostics: { migrationReady: readiness.checks?.migrationReady ?? false }, cjDiagnostics: { cjCredentialsConfigured: readiness.checks?.cjCredentialsConfigured ?? false }, medusaDiagnostics: {}, nextAction:'Resolve blockers and retry.' };
    if (mode === 'readiness' || blockers.length > 0) { result.success = blockers.length === 0; result.nextAction = blockers.length ? 'Resolve readiness blockers then run preview/import.' : 'Run preview or full-safe.'; emit(result); process.exitCode = result.success || isTrue(process.env.CJ_OPERATOR_READINESS_EXIT_ZERO) ? 0 : 1; return; }
    for (const category of categories) {
      const row: CategoryResult = { category, requested, fetched:0, previewed:0, staged:0, valid:0, rejected:0, approved:0, published:0, skipped:0, blockers:[], labelsFound:[], duplicateCount:0, restrictedRejectedCount:0, partialReason: null };
      if (mode === 'preview' || mode === 'import' || mode === 'full-safe') { const preview = await importer.preview(category, requested); const labels = new Set<string>(); for (const item of preview.items || []) { row.fetched += 1; row.previewed += 1; labels.add(String(item.category_slug || item.category || 'unknown')); } row.partialReason = typeof (preview as any).partialReason === 'string' ? (preview as any).partialReason : null; row.labelsFound = [...labels]; if (mode === 'preview' && row.fetched === 0) row.blockers.push('preview_no_products_fetched'); }
      if (!dryRun && (mode === 'import' || mode === 'full-safe')) { const imported = await importer.runImport(category, requested, 'cj_operator'); row.staged = imported.imported || 0; row.valid = imported.accepted || 0; row.rejected = imported.rejected || 0; }
      if (!dryRun && (mode === 'approve-safe' || mode === 'auto-approve-safe' || mode === 'full-safe')) { const { data } = await supabase.schema('app_private').from('cj_product_import_items').select('id,validation_status,approval_status,blockers,category_slug').eq('supplier','cj').eq('category_slug',category).eq('approval_status','pending_admin_approval').limit(requested); for (const item of data || []) { const ok = item.validation_status === 'validated' && (!Array.isArray(item.blockers) || item.blockers.length===0); if (ok) { await publisher.approve(item.id); row.approved += 1; } else { row.skipped += 1; } } }
      if (!dryRun && (mode === 'publish-approved' || mode === 'full-safe')) { const p = await publisher.publishApproved(); row.published += p.published || 0; result.totalMedusaSynced += p.medusaSynced || 0; if (Array.isArray(p.blockers)) result.medusaSyncBlockers = [...new Set([...result.medusaSyncBlockers, ...p.blockers])]; result.medusaDiagnostics = p.medusaDiagnostics || result.medusaDiagnostics; }
      result.categoryResults.push(row); result.totalPreviewed += row.previewed; result.totalFetched += row.fetched; result.totalStaged += row.staged; result.totalApproved += row.approved; result.totalPublished += row.published; result.totalRejected += row.rejected; result.totalSkipped += row.skipped;
    }
    if ((mode === 'publish-approved' || mode === 'full-safe') && result.totalPublished > result.totalMedusaSynced) result.blockers.push('medusa_publish_proof_mismatch');
    result.success = result.blockers.length === 0 && result.categoryResults.every((r: any) => r.blockers.length === 0);
    result.nextAction = result.success ? 'Review artifact and rerun publish-approved if needed.' : 'Inspect blockers.'; emit(result); if (!result.success) process.exitCode = 1;
  } finally { await app.close(); }
}

main().catch((error) => {
  emit({ success:false, mode: process.env.CJ_OPERATOR_MODE || 'readiness', dryRun:isTrue(process.env.CJ_OPERATOR_DRY_RUN), requestedLimitPerCategory: parseLimit(process.env.CJ_OPERATOR_LIMIT_PER_CATEGORY, DEFAULT_LIMIT_PER_CATEGORY), totalCategories:0, categoryResults:[], totalPreviewed:0,totalFetched:0,totalStaged:0,totalApproved:0,totalPublished:0,totalRejected:0,totalSkipped:0,totalMedusaSynced:0, blockers:['operator_exception'], medusaSyncBlockers:[], errorName: error instanceof Error ? error.name : 'Error', errorMessage: error instanceof Error ? error.message : String(error), errorStackPreview: sanitizeStack(error), missingSecrets:[], dbDiagnostics:{}, cjDiagnostics:{}, medusaDiagnostics:{}, nextAction:'Fix runtime error and retry.' });
  process.exit(1);
});
