import { NextRequest } from "next/server";

import { storeProductsResponse } from "../../store/products/store-products-response";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return storeProductsResponse({
    handle: request.nextUrl.searchParams.get("handle")?.trim() || "",
    limit: request.nextUrl.searchParams.get("limit")?.trim() || "20",
  });
}
