import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class CommerceProductSyncService {
  constructor(
    private readonly medusaBridge: MedusaBridgeService,
    private readonly supabase: SupabaseService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async sync(requestId?: string) {
    const products = await this.medusaBridge.listProducts(requestId);

    const upsertRows = products.map((product) => ({
      medusa_product_id: product.id,
      handle: product.handle || null,
      title: product.title,
      subtitle: product.subtitle || null,
      status: product.status || null,
      thumbnail: product.thumbnail || null,
      collection_id: product.collection_id || null,
      type_id: product.type_id || null,
      metadata: product.metadata || {},
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .getClient()
      .from("commerce_product_sync")
      .upsert(upsertRows, {
        onConflict: "medusa_product_id",
      })
      .select("*");

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "commerce_product_sync",
      routePath: "/api/v1/commerce/products/sync",
      method: "POST",
      requestPayload: {
        count: products.length,
      },
      decisionPayload: {
        syncedCount: data?.length || 0,
      },
      metadata: {
        productCount: products.length,
      },
      tags: ["commerce", "products", "sync"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-product-sync",
      status: "ready",
      payload: {
        syncedCount: data?.length || 0,
      },
    });

    return {
      success: true,
      productSync: {
        syncedCount: data?.length || 0,
        products: data || [],
      },
    };
  }
}
