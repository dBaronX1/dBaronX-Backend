import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function apiBaseUrl(): string {
  const value =
    process.env.NEST_API_URL ||
    process.env.NEXT_PUBLIC_NEST_API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "";

  if (!value) {
    throw new Error("NEST_API_URL or NEXT_PUBLIC_NEST_API_URL is required.");
  }

  return value.replace(/\/+$/, "");
}

function forwardAuthHeaders(request: NextRequest): HeadersInit {
  const headers: Record<string, string> = {
    accept: "application/json",
  };

  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const requestId = request.headers.get("x-request-id");

  if (authorization) headers.authorization = authorization;
  if (cookie) headers.cookie = cookie;
  if (requestId) headers["x-request-id"] = requestId;

  return headers;
}

interface RouteParams {
  params: Promise<{
    reference: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { reference } = await context.params;

    const response = await fetch(
      `${apiBaseUrl()}/api/dbx-payments/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: forwardAuthHeaders(request),
        cache: "no-store",
      },
    );

    const data = await response.json().catch(() => null);

    return NextResponse.json(data, {
      status: response.status,
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to fetch DBX payment status.",
      },
      { status: 500 },
    );
  }
}
