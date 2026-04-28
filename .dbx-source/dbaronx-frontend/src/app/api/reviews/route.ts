import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/reviews?product_id=xxx
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("product_id");

  if (!productId) {
    return NextResponse.json({ error: "product_id required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { data: reviews, error } = await supabase
    .from("product_reviews")
    .select(`
      id,
      rating,
      review_text,
      is_verified_purchase,
      helpful_count,
      dbx_staked,
      created_at,
      user_id,
      user_profiles!product_reviews_user_id_fkey(full_name, avatar_url)
    `)
    .eq("product_id", productId)
    .eq("is_approved", true)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Compute summary stats
  const totalReviews = reviews?.length || 0;
  const avgRating =
    totalReviews > 0
      ? Math.round(
          (reviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews) * 10
        ) / 10
      : 0;

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews?.filter((r) => r.rating === star).length || 0,
  }));

  return NextResponse.json({ reviews, avgRating, totalReviews, distribution });
}

// POST /api/reviews
export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { product_id, rating, review_text, order_id } = body;

  if (!product_id || !rating || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "product_id and rating (1-5) required" },
      { status: 400 }
    );
  }

  // Check if user already reviewed this product
  const { data: existing } = await supabase
    .from("product_reviews")
    .select("id")
    .eq("product_id", product_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You have already reviewed this product" },
      { status: 409 }
    );
  }

  // Check if this is a verified purchase
  let isVerifiedPurchase = false;
  if (order_id) {
    const { data: order } = await supabase
      .from("orders")
      .select("id, payment_status")
      .eq("id", order_id)
      .eq("user_id", user.id)
      .in("payment_status", ["approved", "fulfilled"])
      .maybeSingle();
    isVerifiedPurchase = !!order;
  } else {
    // Check if user has any fulfilled order containing this product
    const { data: orders } = await supabase
      .from("orders")
      .select("id, items, payment_status")
      .eq("user_id", user.id)
      .in("payment_status", ["approved", "fulfilled"]);

    isVerifiedPurchase =
      orders?.some((o) =>
        o.items?.some((item: any) => item.id === product_id)
      ) || false;
  }

  const { data: review, error } = await supabase
    .from("product_reviews")
    .insert({
      product_id,
      user_id: user.id,
      order_id: order_id || null,
      rating,
      review_text: review_text || "",
      is_verified_purchase: isVerifiedPurchase,
      is_approved: false, // requires admin approval
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ review, message: "Review submitted for approval" });
}
