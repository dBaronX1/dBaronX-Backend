import { NextResponse } from "next/server";

import { getRuntimePublicConfigFromEnv } from "@/lib/public-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getRuntimePublicConfigFromEnv();
  return NextResponse.json(config, {
    headers: {
      "cache-control": "no-store, max-age=0",
    },
  });
}
