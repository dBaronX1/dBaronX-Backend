import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { LaunchReadinessPersistenceService } from "../../shared/services/launch-readiness-persistence.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { UpdateSupplierOrderStatusDto } from "./dto/update-supplier-order-status.dto";
import { SettleSupplierOrderDto } from "./dto/settle-supplier-order.dto";

@Injectable()
export class SupplierLifecycleService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
    private readonly launchReadinessPersistence: LaunchReadinessPersistenceService,
  ) {}

  async updateStatus(body: UpdateSupplierOrderStatusDto, requestId?: string) {
    const order = await this.getSupplierOrderOrThrow(body.supplierOrderId);

    const allowedTransitions: Record<string, string[]> = {
      created: ["accepted", "cancelled", "failed"],
      accepted: ["processing", "cancelled", "failed"],
      processing: ["shipped", "cancelled", "failed"],
      shipped: ["delivered", "failed"],
      delivered: [],
      cancelled: [],
      failed: [],
    };

    if (!allowedTransitions[String(order.status || "created")]?.includes(body.status)) {
      throw new BadRequestException({
        success: false,
        message: "Invalid supplier order status transition",
        currentStatus: order.status,
        requestedStatus: body.status,
      });
    }

    const metadata = {
      ...(order.metadata || {}),
      ...(body.metadata || {}),
      lifecycle: {
        updatedAt: new Date().toISOString(),
        note: body.note || null,
        trackingNumber: body.trackingNumber || null,
        carrier: body.carrier || null,
        externalReference: body.externalReference || null,
      },
    };

    const { data, error } = await this.supabase
      .getClient()
      .from("supplier_orders")
      .update({
        status: body.status,
        tracking_number: body.trackingNumber || null,
        carrier: body.carrier || null,
        external_reference: body.externalReference || null,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.supplierOrderId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "supplier_order_status_update",
      routePath: "/api/v1/suppliers/orders/status",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        previousStatus: order.status,
        nextStatus: body.status,
      },
      tags: ["suppliers", "lifecycle", "status-update"],
    });

    await this.launchReadinessPersistence.persist({
      requestId,
      source: "supplier-lifecycle-status",
      status:
        body.status === "failed" || body.status === "cancelled"
          ? "degraded"
          : "ready",
      blockers:
        body.status === "failed" ? ["supplier_order_failed"] : [],
      payload: {
        supplierOrderId: body.supplierOrderId,
        status: body.status,
      },
    });

    return {
      success: true,
      supplierOrder: data,
    };
  }

  async settle(body: SettleSupplierOrderDto, requestId?: string) {
    const order = await this.getSupplierOrderOrThrow(body.supplierOrderId);

    if (!["accepted", "processing", "shipped", "delivered"].includes(order.status)) {
      throw new BadRequestException({
        success: false,
        message: "Supplier order is not settleable",
        status: order.status,
      });
    }

    const { data: activeHold, error: holdError } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("user_id", order.supplier_id)
      .eq("reference_type", "supplier_settlement")
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (holdError) {
      throw holdError;
    }

    if (!activeHold) {
      throw new NotFoundException({
        success: false,
        message: "Supplier settlement hold not found",
      });
    }

    await this.walletOrchestration.settleHeldFunds(
      {
        holdId: activeHold.id,
        actorId: body.actorId,
        settlementReferenceId: body.externalReference || order.id,
        settlementReferenceType: "supplier_order_settlement",
        reason: body.note || `Supplier settlement for order ${order.id}`,
        metadata: {
          ...(body.metadata || {}),
          supplierOrderId: order.id,
        },
      },
      requestId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("supplier_orders")
      .update({
        settlement_status: "settled",
        settlement_amount: body.amount,
        settlement_currency: body.currency.toUpperCase(),
        settlement_reference: body.externalReference || null,
        settled_by: body.actorId || null,
        settled_at: new Date().toISOString(),
        metadata: {
          ...(order.metadata || {}),
          ...(body.metadata || {}),
          settlement: {
            amount: body.amount,
            currency: body.currency.toUpperCase(),
            externalReference: body.externalReference || null,
            note: body.note || null,
          },
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.supplierOrderId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "supplier_order_settlement",
      routePath: "/api/v1/suppliers/orders/settle",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: data,
      metadata: {
        supplierId: order.supplier_id,
      },
      tags: ["suppliers", "settlement"],
    });

    return {
      success: true,
      supplierOrder: data,
    };
  }

  private async getSupplierOrderOrThrow(supplierOrderId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("supplier_orders")
      .select("*")
      .eq("id", supplierOrderId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundException({
        success: false,
        message: "Supplier order not found",
      });
    }

    return data;
  }
}
