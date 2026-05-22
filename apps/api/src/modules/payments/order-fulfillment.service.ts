import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

const ALLOWED_DISAPPROVE_REASONS = new Set([
  "fraud_risk",
  "address_issue",
  "stock_issue",
  "shipping_cost_issue",
  "customer_request",
  "manual_review",
]);

@Injectable()
export class OrderFulfillmentService {
  constructor(private readonly supabase: SupabaseService) {}

  async listMine(userId?: string) { /* unchanged */
    if (!userId) throw new UnauthorizedException("Authentication required");
    const { data, error } = await this.supabase.getClient().schema("app_public").from("customer_orders")
      .select("id,checkout_ref,payment_status,order_status,fulfillment_status,product_title,amount_minor,currency,tracking_number,tracking_url,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return { success: true, orders: data ?? [] };
  }

  async statusByReference(ref?: string, email?: string, orderId?: string) { /* unchanged */
    if (!ref && !orderId) throw new BadRequestException("ref or id is required");
    const query = this.supabase.getClient().schema("app_public").from("customer_orders")
      .select("id,checkout_ref,payment_status,order_status,fulfillment_status,product_title,amount_minor,currency,tracking_number,tracking_url,created_at,updated_at,email")
      .limit(1);
    const filtered = orderId ? query.eq("id", orderId) : query.eq("checkout_ref", ref!);
    const { data, error } = await filtered.maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) return { success: false, blocker: "order_not_found" };
    if (email && data.email.toLowerCase() !== email.toLowerCase()) return { success: false, blocker: "email_mismatch" };
    if (!email) return { success: false, blocker: "email_required_for_unauthenticated_lookup" };
    const { email: _email, ...safe } = data;
    return { success: true, order: safe };
  }

  async paymentStatus(sessionId?: string, checkoutRef?: string, email?: string) { /* unchanged */
    if (!sessionId && !checkoutRef) throw new BadRequestException("session_id, checkout_session_id, checkout_ref, or ref is required");
    let query = this.supabase.getClient().schema("app_public").from("customer_orders")
      .select("checkout_ref,stripe_session_id,payment_status,order_status,fulfillment_status,updated_at,email").limit(1);
    query = sessionId ? query.eq("stripe_session_id", sessionId) : query.eq("checkout_ref", checkoutRef!);
    const { data, error } = await query.maybeSingle();
    if (error) throw new BadRequestException(error.message);
    if (!data) return { success: false, blocker: "payment_record_not_found" };
    if (email && data.email.toLowerCase() !== email.toLowerCase()) return { success: false, blocker: "email_mismatch" };
    if (!email) return { success: false, blocker: "email_required_for_unauthenticated_lookup" };
    const { email: _email, ...safe } = data;
    return { success: true, payment: safe };
  }

  async adminListTasks() {
    const { data, error } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks")
      .select(`id,order_id,supplier,supplier_product_id,supplier_sku,status,manual_required,automation_eligible,assigned_to,blockers,created_at,updated_at,order:customer_orders!fulfillment_tasks_order_id_fkey(id,checkout_ref,stripe_session_id,product_title,amount_minor,currency,payment_status,order_status,fulfillment_status,supplier,supplier_product_id,supplier_sku,shipping_address)`)
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return { success: true, tasks: data ?? [] };
  }

  async approveCjTask(id: string, override = false) {
    const { data: task, error } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks")
      .select("id,order_id,status,manual_required,automation_eligible,supplier,supplier_product_id,supplier_sku,cj_order_id,order:customer_orders!fulfillment_tasks_order_id_fkey(id,payment_status,shipping_address,supplier,supplier_product_id,supplier_sku)")
      .eq("id", id).maybeSingle();
    if (error || !task) throw new BadRequestException("task_not_found");
    const order = Array.isArray(task.order) ? task.order[0] : task.order;
    const shipping = order?.shipping_address ?? {};
    const shippingComplete = Boolean(shipping?.country && shipping?.city && shipping?.address1 && shipping?.postal_code);
    const blockers: string[] = [];
    if (order?.payment_status !== "paid_verified") blockers.push("payment_not_verified");
    if (!task.manual_required) blockers.push("manual_review_not_required");
    if (!task.automation_eligible && !override) blockers.push("automation_not_eligible_without_override");
    if (!shippingComplete) blockers.push("shipping_details_incomplete");
    if ((task.supplier ?? order?.supplier) !== "cj") blockers.push("supplier_not_cj");
    if (!(task.supplier_product_id ?? order?.supplier_product_id)) blockers.push("supplier_product_id_missing");
    if (!(task.supplier_sku ?? order?.supplier_sku)) blockers.push("supplier_sku_missing");
    if (task.cj_order_id) blockers.push("cj_order_already_exists");
    if (blockers.length) return { success: false, blocker: "approve_rejected", blockers };
    const updatedAt = new Date().toISOString();
    await this.supabase.getClient().schema("app_private").from("fulfillment_tasks").update({
      status: "approved_for_cj_order",
      admin_approved_at: updatedAt,
      admin_override: override,
      blockers: [],
      updated_at: updatedAt,
    }).eq("id", id);
    await this.supabase.getClient().schema("app_public").from("customer_orders").update({ fulfillment_status: "manual_review_required", updated_at: updatedAt }).eq("id", task.order_id);
    return { success: true, status: "approved_for_cj_order", dryRunDefault: true };
  }

  async disapproveCjTask(id: string, reason: string, note?: string) {
    if (!ALLOWED_DISAPPROVE_REASONS.has(reason)) throw new BadRequestException("invalid_disapprove_reason");
    const updatedAt = new Date().toISOString();
    const { error } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks").update({
      status: "disapproved_hold",
      disapprove_reason: reason,
      disapprove_note: note ?? null,
      updated_at: updatedAt,
    }).eq("id", id);
    if (error) throw new BadRequestException(error.message);
    return { success: true, status: "disapproved_hold", reason };
  }
}
