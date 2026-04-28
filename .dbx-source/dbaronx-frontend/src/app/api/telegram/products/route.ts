import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const supabase = await createClient();

  try {
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
      endpoint: "products",
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
        deep_link: `https://t.me/dBaronX_DBX_Token?start=product-${p.id}`,
        image: p.image_url,
      })),
      telegram_bot: "https://t.me/dBaronX_DBX_Token",
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
