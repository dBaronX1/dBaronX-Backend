import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AiStoryRequest = {
  conceptId?: string;
  title?: string;
  prompt?: string;
  genre?: string;
  length?: string | number;
  tone?: string;
  audience?: string;
  is_series?: boolean;
  isSeries?: boolean;
};

const LENGTHS = new Set(["short", "medium", "long"]);

function normalizedText(value: unknown, fallback = "", limit = 4000) {
  return typeof value === "string" ? value.trim().slice(0, limit) || fallback : fallback;
}

function normalizeLength(value: unknown) {
  const normalized = String(value || "medium").trim().toLowerCase();
  return LENGTHS.has(normalized) ? normalized : "medium";
}

async function getUser(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get("authorization") || "";
  if (!supabaseUrl || !supabaseAnonKey || !authorization) return null;
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { authorization } },
    });
    const { data } = await supabase.auth.getUser();
    return data.user || null;
  } catch {
    return null;
  }
}

function apiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    process.env.NESTJS_API_URL ||
    "https://dbaronx-api-unified-qo2j.onrender.com"
  )
    .trim()
    .replace(/\/+$/, "");
}

function unwrapBackendResponse(data: unknown) {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  if (record?.data && typeof record.data === "object") return record.data as Record<string, unknown>;
  return record;
}

function safeErrorMessage(code: string, fallback?: string) {
  const messages: Record<string, string> = {
    ai_provider_missing: "Story generation is temporarily unavailable. Please try again.",
    provider_failed: "Story generation is temporarily unavailable. Please try again.",
    all_ai_providers_failed: "Story generation is temporarily unavailable. Please try again.",
    fastapi_route_missing: "Story generation is temporarily unavailable. Please try again.",
    fastapi_unavailable: "Story generation is temporarily unavailable. Please try again.",
    validation_failed: "Please check the prompt, length, and tone before trying again.",
    rate_limited: "Story generation is rate limited. Please wait a moment and try again.",
    persistence_failed: "Story generation is temporarily unavailable. Please try again.",
  };
  return messages[code] || fallback || "Story generation is temporarily unavailable. Please try again.";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as AiStoryRequest;
  const prompt = normalizedText(body.prompt, "", 12000);
  const title = normalizedText(body.title, body.conceptId ? body.conceptId.replace(/-/g, " ") : "AI Story", 160);
  const genre = normalizedText(body.genre, "brand", 80);
  const length = normalizeLength(body.length);
  const tone = normalizedText(body.tone, "inspiring", 120);
  const audience = normalizedText(body.audience, "general", 120);
  const conceptId = normalizedText(body.conceptId, "", 128);
  const user = await getUser(request);

  if (!prompt) {
    return NextResponse.json(
      {
        success: false,
        code: "validation_failed",
        message: "Please enter a story prompt.",
        diagnostics: { field: "prompt" },
      },
      { status: 200, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }

  try {
    const response = await fetch(`${apiBaseUrl()}/api/v1/ai-stories/generate`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        ...(conceptId ? { conceptId } : {}),
        title,
        prompt,
        length,
        tone,
        audience,
        genre,
        userId: user?.id || null,
        isSeries: Boolean(body.isSeries ?? body.is_series ?? false),
      }),
    });

    const backend = unwrapBackendResponse(await response.json().catch(() => null));
    if (!backend || backend.success === false || !response.ok) {
      const rawCode = typeof backend?.code === "string" ? backend.code : response.status === 422 ? "validation_failed" : response.status === 404 ? "fastapi_route_missing" : "fastapi_unavailable";
      const code = rawCode === "ai_provider_failed" ? "provider_failed" : rawCode;
      return NextResponse.json(
        {
          success: false,
          code,
          message: safeErrorMessage(code, typeof backend?.message === "string" ? backend.message : undefined),
          diagnostics: backend?.diagnostics && typeof backend.diagnostics === "object" ? backend.diagnostics : { status: response.status },
        },
        { status: 200, headers: { "cache-control": "no-store, max-age=0" } },
      );
    }

    return NextResponse.json(
      {
        success: true,
        storyId: String(backend.storyId || ""),
        title: String(backend.title || title),
        content: String(backend.content || ""),
        wordCount: Number(backend.wordCount || 0),
        estimatedReadingMinutes: Number(backend.estimatedReadingMinutes || 1),
        saved: backend.saved === true,
        fallbackUsed: backend.fallbackUsed === true,
        warnings: Array.isArray(backend.warnings) ? backend.warnings : [],
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        code: "fastapi_unavailable",
        message: safeErrorMessage("fastapi_unavailable"),
        diagnostics: { route: "/api/v1/ai-stories/generate" },
      },
      { status: 200, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }
}
