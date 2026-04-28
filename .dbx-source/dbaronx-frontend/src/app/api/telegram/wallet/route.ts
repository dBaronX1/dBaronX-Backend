import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  return NextResponse.json({
    ok: true,
    endpoint: "wallet",
    wallet_info: {
      supported_wallets: ["Phantom", "Solflare"],
      dbx_mint: "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE",
      merchant_wallet: "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE",
      dbx_holder_discount: "15%",
      connect_url: "https://dbaronx.com/id-card",
      deep_link: "https://t.me/dBaronX_DBX_Token?start=wallet",
      solscan_url: "https://solscan.io/token/4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE",
    },
    id_card: {
      description: "DBX Premium ID Card with Solana Pay QR for instant discounts",
      generate_url: "https://dbaronx.com/id-card",
      benefits: ["15% discount on all purchases", "Priority shipping", "Staking rewards", "Exclusive campaigns"],
    },
    solana_pay: {
      description: "Instant DBX token payments — scan QR at checkout",
      merchant_address: "4ZdL7df7KoDTyVqAnQ398ofsykqsox2S834KQBXNQNYE",
      token: "DBX",
    },
    connected_address: address || null,
  });
}
