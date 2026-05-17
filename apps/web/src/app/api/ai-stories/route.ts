import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

type AiStoryRequest = {
  prompt?: string;
  genre?: string;
  length?: string | number;
  tone?: string;
  is_series?: boolean;
  isSeries?: boolean;
};

function normalizedText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim().slice(0, 4000) : fallback;
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

async function callStoryProvider(input: Required<Pick<AiStoryRequest, "prompt" | "genre" | "tone">> & { length: string; isSeries: boolean; userId?: string }) {
  const backend = (process.env.AI_STORIES_API_URL || process.env.NESTJS_API_URL || process.env.API_BASE_URL || "").trim().replace(/\/+$/, "");
  const serverToken = (process.env.AI_STORIES_API_TOKEN || process.env.INTERNAL_SERVICE_TOKEN || "").trim();
  if (backend) {
    const response = await fetch(`${backend}/api/v1/ai-stories/generate`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        ...(serverToken ? { authorization: `Bearer ${serverToken}` } : {}),
      },
      cache: "no-store",
      body: JSON.stringify(input),
    });
    if (response.ok) {
      const data = await response.json().catch(() => null);
      const content = normalizedText((data as Record<string, unknown> | null)?.content ?? (data as Record<string, unknown> | null)?.text);
      if (content) return { provider: "backend", content, story: data && typeof data === "object" ? data : { content }, saved: Boolean((data as Record<string, unknown> | null)?.saved) };
    }
  }

  const content = `${input.tone} ${input.genre} story\n\n${input.prompt}\n\nYour dBaronX story draft is ready to refine for customers.`;
  return { provider: "rocket", content, story: { content, genre: input.genre, tone: input.tone, length: input.length, isSeries: input.isSeries }, saved: false };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as AiStoryRequest;
    const prompt = normalizedText(body.prompt);
    const genre = normalizedText(body.genre, "brand");
    const length = normalizedText(String(body.length || "short"), "short");
    const tone = normalizedText(body.tone, "inspiring");
    const isSeries = Boolean(body.isSeries ?? body.is_series ?? false);
    const user = await getUser(request);

    if (!prompt) {
      return NextResponse.json(
        { success: false, provider: "rocket", content: "", story: null, saved: false, message: "Please enter a story prompt." },
        { status: 200, headers: { "cache-control": "no-store, max-age=0" } },
      );
    }

    const generated = await callStoryProvider({ prompt, genre, length, tone, isSeries, ...(user?.id ? { userId: user.id } : {}) });
    return NextResponse.json(
      {
        success: true,
        provider: generated.provider,
        content: generated.content,
        story: generated.story,
        saved: generated.saved,
      },
      { headers: { "cache-control": "no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json(
      { success: false, provider: "rocket", content: "", story: null, saved: false, message: "Story generation is temporarily unavailable. Please try again shortly." },
      { status: 200, headers: { "cache-control": "no-store, max-age=0" } },
    );
  }
}
