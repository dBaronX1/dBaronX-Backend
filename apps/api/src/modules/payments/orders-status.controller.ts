import { Controller, Get, Query, Req, UseGuards, VERSION_NEUTRAL, Post, Param, Body } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { Public } from "../../shared/decorators/public.decorator";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { JwtAuthGuard } from "../../shared/guards/jwt-auth.guard";
import { SupabaseService } from "../../shared/services/supabase.service";
import { OrderFulfillmentService } from "./order-fulfillment.service";

@ApiTags("orders")
@Controller({ path: "orders", version: VERSION_NEUTRAL })
export class OrdersStatusController {
  constructor(private readonly orders: OrderFulfillmentService) {}

  @Public()
  @Get("status")
  async status(@Query("ref") ref?: string, @Query("checkout_ref") checkoutRef?: string, @Query("id") orderId?: string, @Query("email") email?: string) {
    return this.orders.statusByReference(ref || checkoutRef, email, orderId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("mine")
  async mine(@Req() req: Request & { user?: { sub?: string } }) {
    return this.orders.listMine(req.user?.sub);
  }
}

@ApiTags("payments")
@Controller({ path: "payments", version: VERSION_NEUTRAL })
export class PaymentsStatusController {
  constructor(private readonly orders: OrderFulfillmentService) {}

  @Public()
  @Get("status")
  async status(
    @Query("session_id") sessionId?: string,
    @Query("checkout_session_id") checkoutSessionId?: string,
    @Query("checkout_ref") checkoutRef?: string,
    @Query("ref") ref?: string,
    @Query("email") email?: string,
  ) {
    return this.orders.paymentStatus(sessionId || checkoutSessionId, checkoutRef || ref, email);
  }
}

@ApiTags("admin-fulfillment")
@Controller({ path: "admin/fulfillment", version: VERSION_NEUTRAL })
@UseGuards(InternalAuthGuard)
export class AdminFulfillmentController {
  constructor(private readonly orders: OrderFulfillmentService, private readonly supabase: SupabaseService) {}

  @Get("tasks")
  async tasks() { return this.orders.adminListTasks(); }

  @Post("tasks/:id/approve-cj")
  async approveCj(@Param("id") id: string, @Body() body: { adminOverride?: boolean }) {
    return this.orders.approveCjTask(id, Boolean(body?.adminOverride));
  }

  @Post("tasks/:id/disapprove-cj")
  async disapproveCj(@Param("id") id: string, @Body() body: { reason?: string; note?: string }) {
    return this.orders.disapproveCjTask(id, String(body?.reason || ""), body?.note);
  }

  @Post("tasks/:id/mark-placed")
  async markPlaced(@Param("id") id: string) {
    const { data: task } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks")
      .select("order_id,order:customer_orders!fulfillment_tasks_order_id_fkey(id,payment_status)")
      .eq("id", id)
      .maybeSingle();
    const order = Array.isArray(task?.order) ? task.order[0] : task?.order;
    if (!order?.id) return { success: false, blocker: "order_not_found" };
    if (order.payment_status !== "paid_verified") return { success: false, blocker: "payment_not_verified" };

    const { error } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks")
      .update({ status: "placed_with_supplier", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    return { success: true, status: "placed_with_supplier" };
  }

  @Post("tasks/:id/add-tracking")
  async addTracking(@Param("id") id: string, @Body() body: { trackingNumber?: string; trackingUrl?: string }) {
    if (!body.trackingNumber && !body.trackingUrl) throw new Error("trackingNumber or trackingUrl required");
    const { data: task } = await this.supabase.getClient().schema("app_private").from("fulfillment_tasks")
      .select("order_id,order:customer_orders!fulfillment_tasks_order_id_fkey(id,payment_status)")
      .eq("id", id)
      .maybeSingle();
    const order = Array.isArray(task?.order) ? task.order[0] : task?.order;
    if (!order?.id) return { success: false, blocker: "order_not_found" };
    if (order.payment_status !== "paid_verified") return { success: false, blocker: "payment_not_verified" };

    const updatedAt = new Date().toISOString();
    await this.supabase.getClient().schema("app_private").from("fulfillment_tasks").update({ status: "tracking_added", updated_at: updatedAt }).eq("id", id);
    await this.supabase.getClient().schema("app_public").from("customer_orders").update({ tracking_number: body.trackingNumber ?? null, tracking_url: body.trackingUrl ?? null, fulfillment_status: "tracking_added", updated_at: updatedAt }).eq("id", task.order_id);
    return { success: true, status: "tracking_added" };
  }
}
