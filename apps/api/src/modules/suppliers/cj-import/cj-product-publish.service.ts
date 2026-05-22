import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../../shared/services/supabase.service";

@Injectable()
export class CjProductPublishService {
  constructor(private readonly supabase: SupabaseService) {}

  async approve(id: string) { return this.supabase.schema("app_private").from("cj_product_import_items").update({ approval_status: "approved", updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); }
  async reject(id: string) { return this.supabase.schema("app_private").from("cj_product_import_items").update({ approval_status: "rejected", updated_at: new Date().toISOString() }).eq("id", id).select("*").single(); }

  async publishApproved() {
    const { data, error } = await this.supabase.schema("app_private").from("cj_product_import_items").select("*").eq("validation_status", "validated").eq("approval_status", "approved").eq("publish_status", "not_published").limit(100);
    if (error) return { success: false, message: error.message, published: 0 };
    let published = 0;
    for (const item of data || []) {
      const payload = {
        supplier: "cj", supplier_product_id: item.supplier_product_id, supplier_sku: item.supplier_sku,
        handle: item.handle, title: item.title, description: item.description, image_url: item.image_url,
        thumbnail: item.image_url, price_minor: item.price_minor, inventory_quantity: item.stock_qty, delivery_estimate: item.delivery_estimate,
        metadata: { supplier: "cj", supplierProductId: item.supplier_product_id, supplierSku: item.supplier_sku, sourceUrl: item.source_url, imageUrl: item.image_url, category: item.category, categorySlug: item.category_slug, shippingCountries: item.shipping_countries || [], deliveryEstimate: item.delivery_estimate, realSupplierProduct: true, demo: false, supplierVerificationStatus: "verified_for_checkout", supplierVerificationBlockers: item.blockers || [] },
        active: true, verification_status: "verified", checkout_enabled: true, updated_at: new Date().toISOString(),
      };
      const upsert = await this.supabase.schema("app_public").from("storefront_products").upsert(payload, { onConflict: "handle" }).select("id").single();
      if (!upsert.error && upsert.data) {
        published += 1;
        await this.supabase.schema("app_private").from("cj_product_import_items").update({ publish_status: "published_to_storefront", storefront_product_id: upsert.data.id, updated_at: new Date().toISOString() }).eq("id", item.id);
      }
    }
    return { success: true, published };
  }
}
