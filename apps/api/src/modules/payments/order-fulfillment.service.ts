import { BadRequestException, Injectable, UnauthorizedException } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class OrderFulfillmentService {
  constructor(private readonly supabase: SupabaseService) {}

  async listMine(userId?: string) {
    if (!userId) throw new UnauthorizedException("Authentication required");
    const { data, error } = await this.supabase.getClient().schema("app_public").from("customer_orders")
      .select("id,checkout_ref,payment_status,order_status,fulfillment_status,product_title,amount_minor,currency,tracking_number,tracking_url,created_at,updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return { success: true, orders: data ?? [] };
  }

  async statusByReference(ref?: string, email?: string, orderId?: string) {
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

  async paymentStatus(sessionId?: string, checkoutRef?: string, email?: string) {
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
      .select(`
        id,
        order_id,
        supplier,
        supplier_product_id,
        supplier_sku,
        status,
        manual_required,
        automation_eligible,
        assigned_to,
        created_at,
        updated_at,
        order:customer_orders!fulfillment_tasks_order_id_fkey(
          id,
          checkout_ref,
          stripe_session_id,
          product_title,
          product_handle,
          amount_minor,
          currency,
          payment_status,
          order_status,
          fulfillment_status,
          supplier,
          supplier_product_id,
          supplier_sku,
          tracking_number,
          tracking_url
        )
      `)
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    const tasks = (data ?? []).map((task) => {
      const order = Array.isArray(task.order) ? task.order[0] : task.order;
      return {
        id: task.id,
        task_status: task.status,
        status: task.status,
        order_id: task.order_id ?? order?.id ?? null,
        checkout_ref: order?.checkout_ref ?? null,
        stripe_session_id: order?.stripe_session_id ?? null,
        product_title: order?.product_title ?? null,
        product_handle: order?.product_handle ?? null,
        amount_minor: order?.amount_minor ?? null,
        currency: order?.currency ?? null,
        payment_status: order?.payment_status ?? null,
        order_status: order?.order_status ?? null,
        fulfillment_status: order?.fulfillment_status ?? null,
        supplier: task.supplier ?? order?.supplier ?? null,
        supplier_product_id: task.supplier_product_id ?? order?.supplier_product_id ?? null,
        supplier_sku: task.supplier_sku ?? order?.supplier_sku ?? null,
        manual_required: task.manual_required,
        automation_eligible: task.automation_eligible,
        tracking_number: order?.tracking_number ?? null,
        tracking_url: order?.tracking_url ?? null,
        assigned_to: task.assigned_to,
        created_at: task.created_at,
        updated_at: task.updated_at,
      };
    });
    return { success: true, tasks };
  }
}
