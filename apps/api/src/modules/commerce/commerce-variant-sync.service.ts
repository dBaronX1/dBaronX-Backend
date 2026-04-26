import { Injectable } from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { MedusaVariantBridgeService } from "../../shared/services/medusa-variant-bridge.service";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class CommerceVariantSyncService {
  constructor(
    private readonly medusaVariantBridge: MedusaVariantBridgeService,
    private readonly supabase: SupabaseService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async sync(medusaProductId: string, requestId?: string) {
    const variants = await this.medusaVariantBridge.listVariantsForProduct(
      medusaProductId,
      requestId,
    );

    const rows = variants.map((variant) => ({
      medusa_variant_id: variant.id,
      medusa_product_id: medusaProductId,
      title: variant.title || null,
      sku: variant.sku || null,
      inventory_quantity:
        typeof variant.inventory_quantity === "number"
          ? variant.inventory_quantity
          : null,
      allow_backorder:
        typeof variant.allow_backorder === "boolean"
          ? variant.allow_backorder
          : null,
      manage_inventory:
        typeof variant.manage_inventory === "boolean"
          ? variant.manage_inventory
          : null,
      prices: variant.prices || [],
      metadata: variant.metadata || {},
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await this.supabase
      .getClient()
      .from("commerce_variant_sync")
      .upsert(rows, {
        onConflict: "medusa_variant_id",
      })
      .select("*");

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "commerce_variant_sync",
      routePath: "/api/v1/commerce/variants/sync",
      method: "POST",
      requestPayload: { medusaProductId },
      decisionPayload: {
        syncedCount: data?.length || 0,
      },
      metadata: {
        medusaProductId,
      },
      tags: ["commerce", "variants", "sync"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "commerce-variant-sync",
      status: "ready",
      payload: {
        medusaProductId,
        syncedCount: data?.length || 0,
      },
    });

    return {
      success: true,
      variantSync: {
        medusaProductId,
        syncedCount: data?.length || 0,
        variants: data || [],
      },
    };
  }
}
