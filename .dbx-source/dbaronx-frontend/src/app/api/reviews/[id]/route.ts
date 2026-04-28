import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/reviews/[id] — approve/reject (admin) or mark helpful (any user)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;

  if (action === "helpful") {
    const { error } = await supabase.rpc("increment_helpful_count", {
      review_id: params.id,
    });
    if (error) {
      // Fallback: manual increment
      const { data: current } = await supabase
        .from("product_reviews")
        .select("helpful_count")
        .eq("id", params.id)
        .single();
      await supabase
        .from("product_reviews")
        .update({ helpful_count: (current?.helpful_count || 0) + 1 })
        .eq("id", params.id);
    }
    return NextResponse.json({ success: true });
  }

  // Admin-only actions
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (action === "approve") {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: true, updated_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (action === "reject") {
    const { error } = await supabase
      .from("product_reviews")
      .update({ is_approved: false, updated_at: new Date().toISOString() })
      .eq("id", params.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// DELETE /api/reviews/[id] — admin only
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase
    .from("product_reviews")
    .delete()
    .eq("id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
