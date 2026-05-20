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

  async statusByReference(ref: string, email?: string) {
    if (!ref) throw new BadRequestException("ref is required");
    let q = this.supabase.getClient().schema("app_public").from("customer_orders")
      .select("id,checkout_ref,payment_status,order_status,fulfillment_status,product_title,amount_minor,currency,tracking_number,tracking_url,created_at,updated_at,email")
      .eq("checkout_ref", ref).limit(1).maybeSingle();
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    if (!data) return { success: false, blocker: "order_not_found" };
    if (email && data.email.toLowerCase() !== email.toLowerCase()) return { success: false, blocker: "email_mismatch" };
    if (!email) return { success: false, blocker: "email_required_for_unauthenticated_lookup" };
    const { email: _email, ...safe } = data;
    return { success: true, order: safe };
  }

  async paymentStatus(sessionId?: string, checkoutRef?: string, email?: string) {
    if (!sessionId && !checkoutRef) throw new BadRequestException("session_id or checkout_ref is required");
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
      .select("id,order_id,supplier,supplier_product_id,supplier_sku,status,manual_required,automation_eligible,assigned_to,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return { success: true, tasks: data ?? [] };
  }
}
