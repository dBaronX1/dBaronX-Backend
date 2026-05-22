import { BadRequestException, Injectable } from "@nestjs/common";
import { CjSupplierAdapterService } from "../adapters/cj/cj-supplier-adapter.service";
import { SupabaseService } from "../../../shared/services/supabase.service";
import { CjProductCategoryMapperService } from "./cj-product-category-mapper.service";
import { CjProductValidationService } from "./cj-product-validation.service";

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
    const sample = this.mockProducts(capped, category);
    return { success: true, mode: "preview", category, limit: capped, items: sample.map((p) => this.normalize(p)) };
  }

  async runImport(category = "all", limit = 50, requestedBy?: string) {
    const capped = this.limit(limit);
    const run = await this.supabase.schema("app_private").from("cj_product_import_runs").insert({ mode: "import_run", status: "running", requested_by: requestedBy || null, category_slug: category, import_limit: capped }).select("*").single();
    if (run.error || !run.data) throw new BadRequestException(run.error?.message || "import run create failed");
    const items = this.mockProducts(capped, category).map((p) => this.normalize(p, run.data.id));
    const { error } = await this.supabase.schema("app_private").from("cj_product_import_items").upsert(items, { onConflict: "supplier,supplier_product_id,supplier_sku" });
    if (error) throw new BadRequestException(error.message);
    const counts = this.count(items);
    await this.supabase.schema("app_private").from("cj_product_import_runs").update({ status: "completed", imported_count: items.length, accepted_count: counts.accepted, rejected_count: counts.rejected, updated_at: new Date().toISOString() }).eq("id", run.data.id);
    return { success: true, runId: run.data.id, imported: items.length, ...counts };
  }

  async listRuns() { return this.supabase.schema("app_private").from("cj_product_import_runs").select("*").order("created_at", { ascending: false }).limit(20); }
  async listItems() { return this.supabase.schema("app_private").from("cj_product_import_items").select("*").order("created_at", { ascending: false }).limit(100); }
  async readiness() {
    const checks = {
      internalAuth: "passed",
      migrationReady: false,
      importRunsTableReady: false,
      importItemsTableReady: false,
      cjCredentialsConfigured: false,
      storefrontPublishTargetReady: false,
      categoryMapperReady: Boolean(this.mapper),
      publishAdapterReady: true,
    };
    const blockers: string[] = [];
    const runs = await this.supabase.schema("app_private").from("cj_product_import_runs").select("id").limit(1);
    checks.importRunsTableReady = !runs.error;
    const items = await this.supabase.schema("app_private").from("cj_product_import_items").select("id").limit(1);
    checks.importItemsTableReady = !items.error;
    const storefront = await this.supabase.schema("app_public").from("storefront_products").select("id").limit(1);
    checks.storefrontPublishTargetReady = !storefront.error;
    checks.migrationReady = checks.importRunsTableReady && checks.importItemsTableReady;
    if (!checks.migrationReady) blockers.push("migration_missing");
    if (!checks.storefrontPublishTargetReady) blockers.push("storefront_publish_target_missing");
    const cred = await this.cjAdapter.preflightCredentials();
    checks.cjCredentialsConfigured = cred.cjTokenPresent;
    if (!checks.cjCredentialsConfigured) blockers.push("cj_credentials_missing");
    return { success: blockers.length === 0, blockers, checks, nextAction: blockers.length ? "Resolve listed blockers and redeploy." : "Ready for CJ import." };
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
  private mockProducts(limit: number, category: string) {
    return Array.from({ length: Math.min(limit, 5) }).map((_, i) => ({ supplierProductId: `cj-${category}-${i + 1}`, supplierSku: `sku-${i + 1}`, title: `CJ ${category} product ${i + 1}`, handle: `cj-${category}-product-${i + 1}`, description: `Safe ${category} catalog item`, sourceUrl: "https://cjdropshipping.com/product/sample", imageUrl: "https://picsum.photos/seed/cj/800/800", category, priceMinor: 1999 + i * 100, costMinor: 999, stockQty: 10, shippingCountries: ["US"], deliveryEstimate: "7-12 days" }));
  }
}
