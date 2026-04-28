import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const supabase = await createClient();

  if (!code) {
    return NextResponse.json({
      error: "code required. Usage: /api/telegram/affiliate?code=YOUR_REFERRAL_CODE",
      affiliate_url: "https://dbaronx.com/affiliates",
      deep_link: "https://t.me/dBaronX_DBX_Token?start=affiliate",
    }, { status: 400 });
  }

  try {
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, referral_code")
      .eq("referral_code", code)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Affiliate code not found" }, { status: 404 });
    }

    const { data: earningsData } = await supabase
      .from("affiliate_earnings")
      .select("amount, status")
      .eq("affiliate_id", profile.id);

    const earnings = earningsData || [];
    const totalEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0);
    const pendingEarnings = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + (e.amount || 0), 0);
    const paidEarnings = earnings.filter((e) => e.status === "paid").reduce((s, e) => s + (e.amount || 0), 0);

    return NextResponse.json({
      ok: true,
      endpoint: "affiliate",
      affiliate: {
        code: profile.referral_code,
        total_earnings: totalEarnings.toFixed(2),
        pending_earnings: pendingEarnings.toFixed(2),
        paid_earnings: paidEarnings.toFixed(2),
        total_referrals: earnings.length,
        commission_rate: "10%",
        payout_note: "Commissions credited only after delivery confirmation",
        affiliate_url: "https://dbaronx.com/affiliates",
        referral_link: `https://dbaronx.com/register?ref=${profile.referral_code}`,
        deep_link: `https://t.me/dBaronX_DBX_Token?start=affiliate-${profile.referral_code}`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
