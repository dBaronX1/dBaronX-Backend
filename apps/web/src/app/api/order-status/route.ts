import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function apiBase() {
  return (process.env.API_BASE_URL || process.env.NESTJS_API_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "").trim().replace(/\/+$/, "");
}

function safeStatusPayload(status = 200) {
  return NextResponse.json(
    {
      success: false,
      status: "unavailable",
      message: "Order status is temporarily unavailable. Please contact support with your order reference.",
    },
    { status, headers: { "cache-control": "no-store, max-age=0" } },
  );
}

export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference")?.trim() || request.nextUrl.searchParams.get("order")?.trim() || "";
  if (!reference) return safeStatusPayload(200);
  const base = apiBase();
  if (!base) return safeStatusPayload(200);

  try {
    const url = new URL(`${base}/api/v1/orders/status`);
    url.searchParams.set("reference", reference);
    const response = await fetch(url, { headers: { accept: "application/json" }, cache: "no-store" });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || typeof payload !== "object") return safeStatusPayload(200);
    const data = payload as Record<string, unknown>;
    return NextResponse.json(
      {
        success: data.success === true,
        status: typeof data.status === "string" ? data.status : "pending",
        orderReference: typeof data.orderReference === "string" ? data.orderReference : reference,
        message: typeof data.message === "string" ? data.message : "Order status loaded.",
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch {
    return safeStatusPayload(200);
  }
}
