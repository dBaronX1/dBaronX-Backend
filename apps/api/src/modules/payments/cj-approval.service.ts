import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../../shared/services/supabase.service";
import { CjApprovalDto } from "./dto/cj-approval.dto";
import { CjDisapprovalDto } from "./dto/cj-disapproval.dto";
import { CjOrderDryRunService } from "./cj-order-dry-run.service";

@Injectable()
export class CjApprovalService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
    private readonly dryRun: CjOrderDryRunService,
  ) {}

  async approve(taskId: string, body: CjApprovalDto, actor: string) {
    const { data: task, error } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks")
      .select("id,order_id,status,supplier,supplier_product_id,supplier_sku,idempotency_key,cj_order_id,manual_required,automation_eligible")
      .eq("id", taskId).maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!task?.order_id) throw new BadRequestException("task_not_found");

    const { data: order, error: orderError } = await this.supabase.getClient().schema("app_public").from("customer_orders")
      .select("id,payment_status,supplier,supplier_product_id,supplier_sku,quantity,shipping_address_line1,shipping_city,shipping_country")
      .eq("id", task.order_id).maybeSingle();
    if (orderError) throw new BadRequestException(orderError.message);
    if (!order) throw new BadRequestException("order_not_found");

    const now = new Date().toISOString();
    const idempotencyKey = body.idempotencyKey ?? task.idempotency_key ?? `${task.id}:${Date.now()}`;
    await this.supabase.getClient().schema("app_private").from("fulfillment_tasks").update({
      admin_approved_at: now,
      admin_approved_by: actor,
      admin_disapproved_at: null,
      disapprove_reason: null,
      disapprove_note: null,
      idempotency_key: idempotencyKey,
      automation_attempted_at: now,
      automation_error: null,
      manual_exception_reason: body.overrideStockShippingChecks ? "admin_override_stock_shipping_checks" : null,
      updated_at: now,
    }).eq("id", taskId);

    const gates = {
      envEnable: this.config.get<string>("DBX_ENABLE_CJ_AUTO_ORDER") === "true",
      envConfirm: this.config.get<string>("DBX_CONFIRM_CJ_ORDER_PLACEMENT") === "true",
      paidVerified: order.payment_status === "paid_verified",
      approved: true,
      shippingComplete: Boolean(order.shipping_address_line1 && order.shipping_city && order.shipping_country),
      supplierCj: (task.supplier ?? order.supplier) === "cj",
      supplierProductId: Boolean(task.supplier_product_id ?? order.supplier_product_id),
      supplierSku: Boolean(task.supplier_sku ?? order.supplier_sku),
      quantityPositive: Number(order.quantity ?? 0) > 0,
      noExistingCjOrder: !task.cj_order_id,
      idempotencyKeyPresent: Boolean(idempotencyKey),
      stockShippingCheckOrOverride: body.overrideStockShippingChecks === true,
    };
    const canPlaceLive = Object.values(gates).every(Boolean);
    const dryRun = this.dryRun.preview({ taskId, orderId: order.id, idempotencyKey, gates, canPlaceLive });
    return { success: true, approved: true, dryRun, livePlacementAttempted: false };
  }

  async disapprove(taskId: string, body: CjDisapprovalDto, actor: string) {
    const now = new Date().toISOString();
    const { error } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks").update({
      admin_disapproved_at: now,
      disapprove_reason: body.reason,
      disapprove_note: body.note ?? null,
      admin_approved_at: null,
      admin_approved_by: null,
      automation_error: "disapproved_by_admin",
      updated_at: now,
    }).eq("id", taskId);
    if (error) throw new BadRequestException(error.message);
    return { success: true, disapproved: true, reason: body.reason, recordedBy: actor, refundAttempted: false };
  }
}
