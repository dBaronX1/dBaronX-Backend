import { BadRequestException, Injectable } from "@nestjs/common";
import { CjSupplierAdapterService } from "../adapters/cj/cj-supplier-adapter.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { CjProductCategoryMapperService } from "./cj-product-category-mapper.service";
import { CjProductValidationService } from "./cj-product-validation.service";
import { execFileSync } from "node:child_process";

@Injectable()
export class CjProductImportService {
  constructor(
    private readonly cjAdapter: CjSupplierAdapterService,
    private readonly supabase: SupabaseService,
    private readonly mapper: CjProductCategoryMapperService,
    private readonly validator: CjProductValidationService,
  ) {}

  async preview(category = "all", limit = 50) {
    const capped = this.limit(limit);
    await this.cjAdapter.preflightCredentials();
    const sample = await this.cjAdapter.fetchProducts(category, capped);
    return { success: true, mode: "preview", category, limit: capped, items: sample.map((p) => this.normalize(p)) };
  }

  async runImport(category = "all", limit = 50, requestedBy?: string) {
    const capped = this.limit(limit);
    const run = await this.supabase.schema("app_private").from("cj_product_import_runs").insert({ mode: "import_run", status: "running", requested_by: requestedBy || null, category_slug: category, import_limit: capped }).select("*").single();
    if (run.error || !run.data) throw new BadRequestException(run.error?.message || "import run create failed");
    const items = (await this.cjAdapter.fetchProducts(category, capped)).map((p) => this.normalize(p, run.data.id));
    const { error } = await this.supabase.schema("app_private").from("cj_product_import_items").upsert(items, { onConflict: "supplier,supplier_product_id,supplier_sku" });
    if (error) throw new BadRequestException(error.message);
    const counts = this.count(items);
    await this.supabase.schema("app_private").from("cj_product_import_runs").update({ status: "completed", imported_count: items.length, accepted_count: counts.accepted, rejected_count: counts.rejected, updated_at: new Date().toISOString() }).eq("id", run.data.id);
    return { success: true, runId: run.data.id, imported: items.length, ...counts };
  }

  async listRuns() { return this.supabase.schema("app_private").from("cj_product_import_runs").select("*").order("created_at", { ascending: false }).limit(20); }
  async listItems() { return this.supabase.schema("app_private").from("cj_product_import_items").select("*").order("created_at", { ascending: false }).limit(100); }
  async readiness() {
    const databaseUrl = String(process.env.DATABASE_URL || '').trim();
    const supabaseUrl = String(process.env.SUPABASE_URL || '').trim();
    const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const requiredTables = {
      'app_private.cj_product_import_runs': false,
      'app_private.cj_product_import_items': false,
      'app_public.storefront_products': false,
      'app_private.fulfillment_tasks': false,
    };
    const dbDiagnostics: Record<string, any> = {
      databaseConnected: false,
      databaseName: null,
      currentUser: null,
      currentSchema: null,
      appPrivateSchemaPresent: false,
      appPublicSchemaPresent: false,
      requiredTables,
      migrationReady: false,
      checkerSource: 'database_url_postgres_to_regclass',
      databaseUrlPresent: Boolean(databaseUrl),
      supabaseUrlPresent: Boolean(supabaseUrl),
      supabaseServiceRolePresent: Boolean(supabaseServiceRoleKey),
      likelySupabaseRestSchemaVisibilityIssue: false,
    };
    const checks = {
      internalAuth: "passed",
      migrationReady: false,
      importRunsTableReady: false,
      importItemsTableReady: false,
      cjCredentialsConfigured: false,
      storefrontPublishTargetReady: false,
      categoryMapperReady: Boolean(this.mapper),
      publishAdapterReady: true,
      fulfillmentTasksTableReady: false,
    };
    const blockers: string[] = [];

    if (!databaseUrl) {
      blockers.push('database_url_missing');
    } else {
      try {
        const sql = `select row_to_json(t) from (
          select
            current_database() as database_name,
            current_user as current_user,
            current_schema() as current_schema,
            exists(select 1 from pg_namespace where nspname = 'app_private') as app_private_schema_present,
            exists(select 1 from pg_namespace where nspname = 'app_public') as app_public_schema_present,
            to_regclass('app_private.cj_product_import_runs') is not null as cj_product_import_runs_present,
            to_regclass('app_private.cj_product_import_items') is not null as cj_product_import_items_present,
            to_regclass('app_public.storefront_products') is not null as storefront_products_present,
            to_regclass('app_private.fulfillment_tasks') is not null as fulfillment_tasks_present
        ) t;`;
        const stdout = execFileSync('psql', [databaseUrl, '-t', '-A', '-c', sql], { encoding: 'utf8' }).trim();
        const row = stdout ? JSON.parse(stdout) : {};
        requiredTables['app_private.cj_product_import_runs'] = Boolean(row.cj_product_import_runs_present);
        requiredTables['app_private.cj_product_import_items'] = Boolean(row.cj_product_import_items_present);
        requiredTables['app_public.storefront_products'] = Boolean(row.storefront_products_present);
        requiredTables['app_private.fulfillment_tasks'] = Boolean(row.fulfillment_tasks_present);
        dbDiagnostics.databaseConnected = true;
        dbDiagnostics.databaseName = row.database_name || null;
        dbDiagnostics.currentUser = row.current_user || null;
        dbDiagnostics.currentSchema = row.current_schema || null;
        dbDiagnostics.appPrivateSchemaPresent = Boolean(row.app_private_schema_present);
        dbDiagnostics.appPublicSchemaPresent = Boolean(row.app_public_schema_present);
      } catch (error) {
        blockers.push('database_connection_failed');
        dbDiagnostics.databaseConnected = false;
        dbDiagnostics.errorName = error instanceof Error ? error.name : 'Error';
        dbDiagnostics.errorMessage = error instanceof Error ? String(error.message || '').slice(0, 200) : String(error).slice(0, 200);
      }
    }

    checks.importRunsTableReady = requiredTables['app_private.cj_product_import_runs'];
    checks.importItemsTableReady = requiredTables['app_private.cj_product_import_items'];
    checks.storefrontPublishTargetReady = requiredTables['app_public.storefront_products'];
    checks.fulfillmentTasksTableReady = requiredTables['app_private.fulfillment_tasks'];

    checks.migrationReady = checks.importRunsTableReady
      && checks.importItemsTableReady
      && checks.storefrontPublishTargetReady
      && checks.fulfillmentTasksTableReady;
    dbDiagnostics.migrationReady = checks.migrationReady;

    if (!checks.importRunsTableReady) blockers.push("cj_import_runs_table_missing");
    if (!checks.importItemsTableReady) blockers.push("cj_import_items_table_missing");
    if (!checks.storefrontPublishTargetReady) blockers.push("storefront_products_table_missing");
    if (!checks.fulfillmentTasksTableReady) blockers.push("fulfillment_tasks_table_missing");
    if (
      dbDiagnostics.databaseConnected
      && checks.migrationReady
      && supabaseUrl
      && supabaseServiceRoleKey
    ) {
      dbDiagnostics.likelySupabaseRestSchemaVisibilityIssue = true;
    }

    const cred = await this.cjAdapter.preflightCredentials();
    checks.cjCredentialsConfigured = cred.cjTokenPresent;
    if (!checks.cjCredentialsConfigured) blockers.push("cj_credentials_missing");

    return {
      success: blockers.length === 0,
      blockers,
      checks,
      dbDiagnostics,
      nextAction: blockers.length ? "Resolve listed blockers and redeploy." : "Ready for CJ import.",
    };
  }


  private normalize(raw: any, runId?: string) {
    const mapped = this.mapper.map({ category: raw.category, title: raw.title, description: raw.description });
    const valid = this.validator.validate({ ...raw, supplier: "cj", checkoutReady: true });
    const blockers = [...new Set([...(mapped.blockers || []), ...(valid.blockers || [])])];
    return {
      ...(runId ? { import_run_id: runId } : {}), supplier: "cj", supplier_product_id: raw.supplierProductId, supplier_sku: raw.supplierSku,
      cj_payload: raw, title: raw.title, handle: raw.handle, description: raw.description, source_url: raw.sourceUrl, image_url: raw.imageUrl,
      category: mapped.category, category_slug: mapped.categorySlug, price_minor: raw.priceMinor, cost_minor: raw.costMinor, stock_qty: raw.stockQty,
      shipping_countries: raw.shippingCountries, delivery_estimate: raw.deliveryEstimate,
      validation_status: mapped.blocked || !valid.valid ? "validation_failed" : "validated", approval_status: "pending_admin_approval", publish_status: "not_published", blockers,
    };
  }

  private count(items: any[]) { const rejected = items.filter((i) => i.validation_status === "validation_failed").length; return { accepted: items.length - rejected, rejected }; }
  private limit(n: number) { if (n > 100) return 100; if (n < 1) throw new BadRequestException("limit_must_be_positive"); return n; }
}
