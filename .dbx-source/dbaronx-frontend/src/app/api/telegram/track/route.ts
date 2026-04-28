import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("order_id");
  const supabase = await createClient();

  if (!orderId) {
    return NextResponse.json({ error: "order_id required. Usage: /api/telegram/track?order_id=YOUR_ORDER_ID" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .select("id, payment_status, total_usd, total_dbx, created_at, shipping_address, admin_notes, items")
      .eq("id", orderId)
      .single();

    if (error) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const statusMessages: Record<string, string> = {
      pending: "⏳ Payment pending — awaiting confirmation",
      proof_uploaded: "📋 Payment proof received — under review",
      approved: "✅ Payment approved — preparing shipment",
      fulfilled: "📦 Order shipped — check your pickup point",
      cancelled: "❌ Order cancelled",
    };

    return NextResponse.json({
      ok: true,
      endpoint: "track",
      order: {
        id: data.id,
        status: data.payment_status,
        status_message: statusMessages[data.payment_status] || data.payment_status,
        total_usd: data.total_usd,
        total_dbx: data.total_dbx,
        created_at: data.created_at,
        items_count: Array.isArray(data.items) ? data.items.length : 0,
        admin_notes: data.admin_notes || null,
        shop_url: "https://dbaronx.com/shop",
        deep_link: `https://t.me/dBaronX_DBX_Token?start=track-${data.id}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
