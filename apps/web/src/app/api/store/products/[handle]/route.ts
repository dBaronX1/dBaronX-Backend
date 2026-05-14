import { NextRequest } from "next/server";

import { storeProductsResponse } from "../store-products-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, context: { params: Promise<{ handle: string }> }) {
  const { handle } = await context.params;
  return storeProductsResponse({
    handle: decodeURIComponent(handle || "").trim(),
    limit: request.nextUrl.searchParams.get("limit")?.trim() || "5",
  });
}
