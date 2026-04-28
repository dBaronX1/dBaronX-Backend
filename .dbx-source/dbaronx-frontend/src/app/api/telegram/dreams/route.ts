import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, title, description, goal_usd, raised_usd, campaign_status, end_date, image_url, rewards")
      .eq("campaign_status", "active")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      endpoint: "dreams",
      count: data?.length || 0,
      campaigns: data?.map((c) => ({
        id: c.id,
        title: c.title,
        description: c.description?.slice(0, 100) + "...",
        goal_usd: c.goal_usd,
        raised_usd: c.raised_usd,
        progress_pct: Math.round((c.raised_usd / c.goal_usd) * 100),
        end_date: c.end_date,
        rewards_count: Array.isArray(c.rewards) ? c.rewards.length : 0,
        dreams_url: "https://dbaronx.com/dreams",
        deep_link: `https://t.me/dBaronX_DBX_Token?start=campaign-${c.id}`,
      })),
      dreams_url: "https://dbaronx.com/dreams",
      deep_link: "https://t.me/dBaronX_DBX_Token?start=dreams",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
