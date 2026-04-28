//src/app/api/ai-stories/route.ts

import { createClient } from "@supabase/supabase-js";
import { Anthropic } from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

const anthropic = anthropicApiKey
  ? new Anthropic({ apiKey: anthropicApiKey })
  : null;

const openai = openaiApiKey
  ? new OpenAI({ apiKey: openaiApiKey })
  : null;

const genAI = geminiApiKey
  ? new GoogleGenerativeAI(geminiApiKey)
  : null;

type RequestBody = {
  user_id?: string;
  title?: string;
  prompt?: string;
  genre?: string;
  isSeries?: boolean;
};

function json(status: number, body: Record<string, unknown>) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeTitle(title: string | undefined, prompt: string): string {
  const raw = (title || "").trim();
  if (raw.length > 0) return raw;
  const cleanPrompt = prompt.trim();
  if (cleanPrompt.length <= 60) return cleanPrompt;
  return `${cleanPrompt.slice(0, 60)}...`;
}

function buildPrompt(
  title: string,
  prompt: string,
  genre: string,
  isSeries: boolean
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt =
    "You are a master storyteller for the dBaronX global eco-commerce platform. Create immersive, hopeful, well-structured stories that subtly highlight sustainability, community, innovation, and financial empowerment. The writing must be engaging, vivid, clean, and age-appropriate. If it is a mini-series, structure it into exactly 3 chapters with clear chapter headings. If it is a short story, provide a complete standalone story with a strong opening, meaningful middle, and satisfying ending.";

  const userPrompt = `Story title: ${title}
Genre: ${genre}
Format: ${isSeries ? "3-chapter mini-series" : "short story"}

Story idea:
${prompt}

Requirements:
- Make it creative, polished, and immersive
- Keep the writing readable and emotionally engaging
- Use clear structure
- Do not return JSON
- Return plain story text only`;

  return { systemPrompt, userPrompt };
}

async function generateWithAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!anthropic) return "";

  const response = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 2500,
    temperature: 0.8,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  let text = "";

  for (const block of response.content) {
    if (block.type === "text") {
      text += block.text;
    }
  }

  return text.trim();
}

async function generateWithOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!openai) return "";

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2500,
    temperature: 0.8,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  return response.choices?.[0]?.message?.content?.trim() || "";
}

async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  if (!genAI) return "";

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
  });

  const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
  const response = result.response;
  const text = response.text();

  return (text || "").trim();
}

export async function POST(req: NextRequest) {
  try {
    let body: RequestBody;

    try {
      body = (await req.json()) as RequestBody;
    } catch (error) {
      console.error("Invalid request JSON:", error);
      return json(400, { error: "Invalid JSON body" });
    }

    const user_id = (body.user_id || "").trim();
    const prompt = (body.prompt || "").trim();
    const genre = (body.genre || "eco-adventure").trim();
    const isSeries = Boolean(body.isSeries);
    const title = normalizeTitle(body.title, prompt);

    if (!user_id || !prompt) {
      return json(400, { error: "user_id and prompt are required" });
    }

    const { systemPrompt, userPrompt } = buildPrompt(title, prompt, genre, isSeries);

    let content = "";
    let providerUsed = "";

    if (!content) {
      try {
        content = await generateWithAnthropic(systemPrompt, userPrompt);
        if (content) providerUsed = "anthropic";
      } catch (error) {
        console.error("Anthropic failed:", error);
      }
    }

    if (!content || content.length < 300) {
      try {
        const openaiContent = await generateWithOpenAI(systemPrompt, userPrompt);
        if (openaiContent && openaiContent.length >= content.length) {
          content = openaiContent;
          providerUsed = "openai";
        }
      } catch (error) {
        console.error("OpenAI failed:", error);
      }
    }

    if (!content || content.length < 300) {
      try {
        const geminiContent = await generateWithGemini(systemPrompt, userPrompt);
        if (geminiContent && geminiContent.length >= content.length) {
          content = geminiContent;
          providerUsed = "gemini";
        }
      } catch (error) {
        console.error("Gemini failed:", error);
      }
    }

    if (!content || !content.trim()) {
      return json(500, {
        error: "All AI providers failed to generate a story",
      });
    }

    const { data, error } = await supabase
      .from("ai_stories")
      .insert({
        user_id,
        title,
        prompt,
        content,
        genre,
        is_series: isSeries,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase save error:", error);
      return json(500, {
        error: "Failed to save story",
        details: error.message,
      });
    }

    return json(200, {
      success: true,
      provider: providerUsed,
      story: data,
    });
  } catch (error) {
    console.error("api/ai-stories fatal error:", error);

    return json(500, {
      error: "Internal server error",
    });
  }
}