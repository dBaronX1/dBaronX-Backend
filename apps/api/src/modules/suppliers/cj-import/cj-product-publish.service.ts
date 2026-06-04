import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../../../shared/services/supabase.service";

type MedusaDiagnostics = {
  baseUrlPresent: boolean;
  adminApiKeyPresent: boolean;
  publishableKeyPresent: boolean;
};

@Injectable()
export class CjProductPublishService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  async approve(id: string) {
    return this.supabase
      .schema("app_private")
      .from("cj_product_import_items")
      .update({
        approval_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
  }
  async reject(id: string) {
    return this.supabase
      .schema("app_private")
      .from("cj_product_import_items")
      .update({
        approval_status: "rejected",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
  }

  private medusaConfig(): {
    baseUrl: string;
    adminApiKey: string;
    publishableKey: string;
    diagnostics: MedusaDiagnostics;
  } {
    const baseUrl = String(
      this.config.get<string>("MEDUSA_BASE_URL") ||
        this.config.get<string>("MEDUSA_URL") ||
        "",
    )
      .trim()
      .replace(/\/+$/, "");
    const adminApiKey = String(
      this.config.get<string>("MEDUSA_ADMIN_API_KEY") ||
        this.config.get<string>("MEDUSA_API_KEY") ||
        "",
    ).trim();
    const publishableKey = String(
      this.config.get<string>("MEDUSA_PUBLISHABLE_KEY") || "",
    ).trim();
    return {
      baseUrl,
      adminApiKey,
      publishableKey,
      diagnostics: {
        baseUrlPresent: !!baseUrl,
        adminApiKeyPresent: !!adminApiKey,
        publishableKeyPresent: !!publishableKey,
      },
    };
  }

  async publishApproved() {
    const medusa = this.medusaConfig();
    if (
      !medusa.diagnostics.baseUrlPresent ||
      !medusa.diagnostics.adminApiKeyPresent
    ) {
      return {
        success: false,
        message: "medusa_sync_not_configured",
        published: 0,
        medusaSynced: 0,
        blockers: ["medusa_sync_not_configured"],
        medusaDiagnostics: medusa.diagnostics,
      };
    }
    const { data, error } = await this.supabase
      .schema("app_private")
      .from("cj_product_import_items")
      .select("*")
      .eq("validation_status", "validated")
      .eq("approval_status", "approved")
      .eq("publish_status", "not_published")
      .limit(100);
    if (error)
      return {
        success: false,
        message: error.message,
        published: 0,
        medusaSynced: 0,
        blockers: ["supabase_fetch_failed"],
        medusaDiagnostics: medusa.diagnostics,
      };
    let published = 0;
    let medusaSynced = 0;
    const blockers: string[] = [];
    for (const item of data || []) {
      const handle =
        item.handle ||
        `cj-${item.supplier_product_id}-${item.supplier_sku}`
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "");
      const medusaPayload = {
        title: item.title,
        handle,
        description: item.description,
        images: item.image_url ? [{ url: item.image_url }] : [],
        status: "published",
        metadata: {
          supplier: "cj",
          supplierProductId: item.supplier_product_id,
          supplierSku: item.supplier_sku,
          sourceUrl: item.source_url,
          realSupplierProduct: true,
          supplierVerificationStatus: "verified_for_checkout",
        },
        options: [{ title: "Default", values: ["Default"] }],
        variants: [
          {
            title: "Default",
            sku: item.supplier_sku,
            manage_inventory: true,
            inventory_quantity: Number(item.stock_qty || 0),
            prices: [
              { amount: Number(item.price_minor || 0), currency_code: "usd" },
            ],
          },
        ],
      };
      const response = await fetch(`${medusa.baseUrl}/admin/products`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${medusa.adminApiKey}`,
        },
        body: JSON.stringify(medusaPayload),
      });
      if (!response.ok) {
        blockers.push("medusa_sync_failed");
        continue;
      }
      const medusaResponse = await response.json().catch(() => ({}));
      const medusaProduct = this.extractMedusaProduct(medusaResponse);
      const medusaProductId = String(medusaProduct?.id || "").trim();
      const medusaVariantId = this.extractFirstVariantId(medusaProduct);
      if (!medusaProductId || !medusaVariantId) {
        blockers.push("medusa_sync_product_shape_missing");
        continue;
      }
      medusaSynced += 1;
      const payload = {
        supplier: "cj",
        supplier_product_id: item.supplier_product_id,
        supplier_sku: item.supplier_sku,
        medusa_product_id: medusaProductId,
        medusa_variant_id: medusaVariantId,
        handle,
        title: item.title,
        description: item.description,
        image_url: item.image_url,
        thumbnail: item.image_url,
        images: item.image_url ? [item.image_url] : [],
        price_minor: item.price_minor,
        inventory_quantity: item.stock_qty,
        delivery_estimate: item.delivery_estimate,
        metadata: {
          supplier: "cj",
          supplierProductId: item.supplier_product_id,
          supplierSku: item.supplier_sku,
          sourceUrl: item.source_url,
          imageUrl: item.image_url,
          category: item.category,
          categorySlug: item.category_slug,
          shippingCountries: item.shipping_countries || [],
          deliveryEstimate: item.delivery_estimate,
          realSupplierProduct: true,
          demo: false,
          supplierVerificationStatus: "verified_for_checkout",
          supplierVerificationBlockers: item.blockers || [],
          publicLabels: [
            "Verified Supplier",
            "Direct Shipping",
            "Global Supplier",
          ],
        },
        active: true,
        verification_status: "verified",
        checkout_enabled: true,
        updated_at: new Date().toISOString(),
      };
      const upsert = await this.supabase
        .schema("app_public")
        .from("storefront_products")
        .upsert(payload, { onConflict: "handle" })
        .select("id")
        .single();
      if (!upsert.error && upsert.data) {
        published += 1;
        await this.supabase
          .schema("app_private")
          .from("cj_product_import_items")
          .update({
            publish_status: "published_to_storefront",
            storefront_product_id: upsert.data.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id);
      }
    }
    return {
      success: blockers.length === 0,
      published,
      medusaSynced,
      blockers: [...new Set(blockers)],
      medusaDiagnostics: medusa.diagnostics,
    };
  }

  private extractMedusaProduct(payload: any): any {
    if (payload?.product && typeof payload.product === "object")
      return payload.product;
    if (payload?.data?.product && typeof payload.data.product === "object")
      return payload.data.product;
    if (payload?.data && typeof payload.data === "object" && payload.data.id)
      return payload.data;
    return payload && typeof payload === "object" && payload.id
      ? payload
      : null;
  }

  private extractFirstVariantId(product: any): string {
    const variants = Array.isArray(product?.variants) ? product.variants : [];
    const variant = variants.find(
      (entry) => String(entry?.id || "").trim().length > 0,
    );
    return String(variant?.id || "").trim();
  }
}
