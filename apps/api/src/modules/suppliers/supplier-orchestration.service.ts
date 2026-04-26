import { Injectable } from "@nestjs/common";
import { CommerceOrderBridgeService } from "../commerce/commerce-order-bridge.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { CreateSupplierOrderDto } from "./dto/create-supplier-order.dto";

@Injectable()
export class SupplierOrchestrationService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly commerceOrderBridge: CommerceOrderBridgeService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async createOrder(body: CreateSupplierOrderDto, requestId?: string) {
    const bridge = await this.commerceOrderBridge.syncOrder(
      {
        medusaOrderId: body.medusaOrderId,
        customerId: body.customerId,
        affiliateUserId: body.affiliateUserId,
        supplierId: body.supplierId,
        syncMode: "reconcile",
        metadata: body.metadata,
      },
      requestId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("supplier_orders")
      .insert({
        supplier_id: body.supplierId,
        medusa_order_id: body.medusaOrderId,
        customer_id: body.customerId || null,
        affiliate_user_id: body.affiliateUserId || null,
        items: body.items,
        shipping_address: body.shippingAddress || {},
        metadata: body.metadata || {},
        status: "created",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "supplier_order_create",
      routePath: "/api/v1/suppliers/orders",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        medusaOrderId: body.medusaOrderId,
        bridge: bridge.orderSync,
      },
      tags: ["suppliers", "order", "create"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "supplier-orchestration",
      status: "ready",
      payload: {
        supplierOrderId: data.id,
        supplierId: body.supplierId,
        medusaOrderId: body.medusaOrderId,
      },
    });

    return {
      success: true,
      supplierOrder: data,
      bridge: bridge.orderSync,
    };
  }
}
