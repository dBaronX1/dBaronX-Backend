import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  return NextResponse.json({
    ok: true,
    endpoint: "support",
    support: {
      telegram_group: "https://t.me/dBaronX_DBX_Token",
      email: "info@dbaronx.com",
      response_time: "Within 24 hours",
      faq: [
        { q: "How do I track my order?", a: "Use /api/telegram/track?order_id=YOUR_ID or visit dbaronx.com/shop" },
        { q: "How do I earn affiliate commissions?", a: "Share your referral link from dbaronx.com/affiliates — earn 10% after delivery" },
        { q: "What is DBX token?", a: "DBX is the Solana utility token powering the dBaronX ecosystem. Visit dbaronx.com/dbx-token" },
        { q: "How do I pay with Solana Pay?", a: "Select Solana Pay at checkout and scan the QR code with Phantom or Solflare wallet" },
        { q: "How does anonymous shipping work?", a: "Choose a post office or parcel locker at checkout — no home address needed" },
      ],
      deep_links: {
        shop: "https://t.me/dBaronX_DBX_Token?start=shop",
        track: "https://t.me/dBaronX_DBX_Token?start=track",
        affiliate: "https://t.me/dBaronX_DBX_Token?start=affiliate",
        impact: "https://t.me/dBaronX_DBX_Token?start=impact",
        dreams: "https://t.me/dBaronX_DBX_Token?start=dreams",
        wallet: "https://t.me/dBaronX_DBX_Token?start=wallet",
      },
    },
  });
}
