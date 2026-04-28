import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ============================================================
// dBaronX Telegram Bot API Endpoints
// All endpoints are prefixed /api/bot/
// ============================================================

// GET /api/bot/products — list active products
// GET /api/bot/impact — latest impact metrics
// GET /api/bot/track?order_id=xxx — track order
// GET /api/bot/campaigns — active crowdfunding campaigns
// POST /api/bot/affiliate — get affiliate info

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const supabase = await createClient();

  try {
    switch (action) {
      case "products": {
        const category = searchParams.get("category");
        let query = supabase
          .from("products")
          .select("id, name, description, price, price_dbx, image_url, category, stock")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (category && category !== "all") {
          query = query.eq("category", category);
        }

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({
          ok: true,
          action: "products",
          count: data?.length || 0,
          products: data?.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description?.slice(0, 120) + (p.description?.length > 120 ? "..." : ""),
            price_usd: p.price,
            price_dbx: p.price_dbx,
            category: p.category,
            in_stock: p.stock > 0,
            shop_url: `https://dbaronx.com/shop`,
            image: p.image_url,
          })),
        });
      }

      case "impact": {
        const { data, error } = await supabase
          .from("impact_metrics")
          .select("*")
          .order("metric_date", { ascending: false })
          .limit(7);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        const rows = data || [];
        const totals = {
          waste_tons: rows.reduce((s, r) => s + (r.waste_processed_tons || 0), 0).toFixed(1),
          co2_tons: rows.reduce((s, r) => s + (r.co2_saved_tons || 0), 0).toFixed(1),
          jobs: Math.max(...rows.map((r) => r.jobs_created || 0), 0),
          plastic_kg: rows.reduce((s, r) => s + (r.plastic_recycled_kg || 0), 0).toFixed(0),
          soap_bars: rows.reduce((s, r) => s + (r.soap_bars_produced || 0), 0),
          biochar_kg: rows.reduce((s, r) => s + (r.biochar_kg || 0), 0).toFixed(0),
        };

        return NextResponse.json({
          ok: true,
          action: "impact",
          period: "last_7_days",
          totals,
          latest: rows[0] || null,
          impact_url: "https://dbaronx.com/impact",
        });
      }

      case "track": {
        const orderId = searchParams.get("order_id");
        if (!orderId) {
          return NextResponse.json({ error: "order_id required" }, { status: 400 });
        }

        const { data, error } = await supabase
          .from("orders")
          .select("id, payment_status, total_usd, total_dbx, created_at, shipping_address")
          .eq("id", orderId)
          .single();

        if (error) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        return NextResponse.json({
          ok: true,
          action: "track",
          order: {
            id: data.id,
            status: data.payment_status,
            total_usd: data.total_usd,
            total_dbx: data.total_dbx,
            created_at: data.created_at,
            shop_url: "https://dbaronx.com/shop",
          },
        });
      }

      case "campaigns": {
        const { data, error } = await supabase
          .from("campaigns")
          .select("id, title, description, goal_usd, raised_usd, campaign_status, end_date, image_url")
          .eq("campaign_status", "active")
          .order("created_at", { ascending: false })
          .limit(5);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({
          ok: true,
          action: "campaigns",
          count: data?.length || 0,
          campaigns: data?.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description?.slice(0, 100) + "...",
            goal_usd: c.goal_usd,
            raised_usd: c.raised_usd,
            progress_pct: Math.round((c.raised_usd / c.goal_usd) * 100),
            end_date: c.end_date,
            dreams_url: "https://dbaronx.com/dreams",
          })),
        });
      }

      case "affiliate": {
        const code = searchParams.get("code");
        if (!code) {
          return NextResponse.json({ error: "code required" }, { status: 400 });
        }

        const { data, error } = await supabase
          .from("affiliates")
          .select("id, referral_code, total_earnings, pending_earnings, total_referrals")
          .eq("referral_code", code)
          .single();

        if (error) return NextResponse.json({ error: "Affiliate not found" }, { status: 404 });

        return NextResponse.json({
          ok: true,
          action: "affiliate",
          affiliate: {
            code: data.referral_code,
            total_earnings: data.total_earnings,
            pending_earnings: data.pending_earnings,
            total_referrals: data.total_referrals,
            affiliate_url: "https://dbaronx.com/affiliates",
          },
        });
      }

      case "menu": {
        return NextResponse.json({
          ok: true,
          action: "menu",
          bot_name: "dBaronX Bot",
          commands: [
            { cmd: "products", desc: "Browse eco-products from Ghana" },
            { cmd: "impact", desc: "View live impact metrics" },
            { cmd: "track", desc: "Track your order" },
            { cmd: "campaigns", desc: "Active crowdfunding campaigns" },
            { cmd: "affiliate", desc: "Check affiliate earnings" },
            { cmd: "wallet", desc: "Connect Phantom wallet" },
            { cmd: "support", desc: "Get support" },
          ],
          deep_links: {
            shop: "https://dbaronx.com/shop",
            impact: "https://dbaronx.com/impact",
            dreams: "https://dbaronx.com/dreams",
            affiliates: "https://dbaronx.com/affiliates",
            dbx_token: "https://dbaronx.com/dbx-token",
            blog: "https://dbaronx.com/blog",
            telegram: "https://t.me/dBaronX_DBX_Token",
          },
        });
      }

      default:
        return NextResponse.json({
          ok: true,
          message: "dBaronX Bot API",
          version: "1.0",
          actions: ["products", "impact", "track", "campaigns", "affiliate", "menu"],
          docs: "GET /api/bot?action=menu",
        });
    }
  } catch (err) {
    console.error("Bot API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action } = body;
  const supabase = await createClient();

  if (action === "webhook") {
    // Telegram webhook handler placeholder
    const update = body.update;
    if (!update) return NextResponse.json({ ok: true });

    // Log incoming update (extend with actual bot logic)
    console.log("Telegram update received:", JSON.stringify(update).slice(0, 200));

    return NextResponse.json({ ok: true, received: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
