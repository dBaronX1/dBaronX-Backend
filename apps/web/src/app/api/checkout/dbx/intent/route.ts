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
    "content-type": "application/json",
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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();

    const response = await fetch(`${apiBaseUrl()}/api/dbx-payments/intents`, {
      method: "POST",
      headers: forwardAuthHeaders(request),
      body: JSON.stringify(payload),
      cache: "no-store",
    });

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
            : "Failed to create DBX payment intent.",
      },
      { status: 500 },
    );
  }
}
