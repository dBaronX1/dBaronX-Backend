import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
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
      farm_yield_kg: rows.reduce((s, r) => s + (r.farm_yield_kg || 0), 0).toFixed(0),
      biogas_kwh: rows.reduce((s, r) => s + (r.biogas_kwh || 0), 0).toFixed(0),
    };

    return NextResponse.json({
      ok: true,
      endpoint: "impact",
      period: "last_7_days",
      totals,
      latest: rows[0] || null,
      impact_url: "https://dbaronx.com/impact",
      deep_link: "https://t.me/dBaronX_DBX_Token?start=impact",
      summary: `♻️ ${totals.waste_tons}t waste | 🌱 ${totals.co2_tons}t CO₂ saved | 👷 ${totals.jobs} jobs | 🧼 ${totals.soap_bars} soaps`,
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
