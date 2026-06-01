import { randomUUID } from "node:crypto";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GenerateAiStoryDto } from "./dto/generate-ai-story.dto";
import { SupabaseService } from "../../shared/services/supabase.service";

type StorySuccess = {
  success: true;
  storyId: string;
  title: string;
  content: string;
  provider: string;
  model: string;
  wordCount: number;
  estimatedReadingMinutes: number;
  saved: boolean;
  fallbackUsed: boolean;
  warnings: string[];
  meta: Record<string, unknown>;
};

type StoryFailureCode =
  | "ai_provider_missing"
  | "all_ai_providers_failed"
  | "provider_failed"
  | "fastapi_route_missing"
  | "fastapi_unavailable"
  | "validation_failed"
  | "rate_limited"
  | "persistence_failed";

type StoryFailure = {
  success: false;
  code: StoryFailureCode;
  message: string;
  diagnostics: Record<string, unknown>;
  meta: Record<string, unknown>;
};

type StoryResponse = StorySuccess | StoryFailure;

const DEFAULT_FASTAPI_BASE_URL = "https://dbaronx-fastapi-5ci9.onrender.com";

const LENGTH_TOKENS: Record<GenerateAiStoryDto["length"], number> = {
  short: 700,
  medium: 1500,
  long: 3000,
};

@Injectable()
export class AiStoriesGenerationService {
  private readonly logger = new Logger(AiStoriesGenerationService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async generate(body: GenerateAiStoryDto, requestId?: string): Promise<StoryResponse> {
    const fastapiBaseUrl = this.fastapiBaseUrl();

    if (!fastapiBaseUrl) {
      return this.failure("fastapi_unavailable", "The story generation service is not configured.", {
        blocker: "FASTAPI_BASE_URL missing on NestJS API",
      });
    }

    const payload = {
      conceptId: body.conceptId || null,
      title: body.title,
      titleHint: body.title,
      prompt: body.prompt,
      length: body.length,
      tone: body.tone,
      audience: body.audience || null,
      genre: body.genre || "brand",
      userId: body.userId || null,
      maxOutputTokens: LENGTH_TOKENS[body.length],
      metadata: {
        source: "nestjs.ai-stories.generate",
        requestId: requestId || null,
      },
    };

    const fastapiResponse = await this.fetchFastapi(`${fastapiBaseUrl}/ai/stories/generate`, payload, requestId);

    if (fastapiResponse.ok === false) {
      return fastapiResponse.failure;
    }

    const normalized = this.normalizeSuccess(fastapiResponse.data);

    if (!normalized.success) {
      return normalized;
    }

    if (normalized.saved) {
      return normalized;
    }

    try {
      const saved = await this.persistStory(body, normalized);
      return {
        ...normalized,
        storyId: saved.id || normalized.storyId,
        saved: true,
        warnings: normalized.warnings.filter((warning) => warning !== "persistence_not_confirmed"),
      };
    } catch (error) {
      this.logger.warn(
        JSON.stringify({
          event: "ai_stories_nest_persistence_failed",
          requestId: requestId || null,
          errorName: error instanceof Error ? error.name : "UnknownError",
        }),
      );
      return {
        ...normalized,
        saved: false,
        warnings: Array.from(new Set([...normalized.warnings, "persistence_failed"])),
      };
    }
  }

  async readiness(): Promise<Record<string, unknown>> {
    const fastapiBaseUrl = this.fastapiBaseUrl();
    const blockers: string[] = [];
    let fastapiReachable = false;
    let providerConfigured = false;
    let generationEndpointReady = false;
    let persistenceReady = false;

    if (!fastapiBaseUrl) {
      blockers.push("fastapi_unavailable");
    } else {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(`${fastapiBaseUrl}/ai/stories/readiness`, {
          headers: this.fastapiHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await response.json().catch(() => ({}));
        fastapiReachable = response.ok;
        if (response.status === 404) {
          blockers.push("fastapi_route_missing");
        } else if (!response.ok) {
          blockers.push("fastapi_unavailable");
        } else {
          providerConfigured = Boolean(data?.providerConfigured || data?.provider_configured);
          generationEndpointReady = Boolean(data?.generationEndpointReady || data?.generation_endpoint_ready);
          if (!providerConfigured) blockers.push("ai_provider_missing");
          if (Array.isArray(data?.blockers)) {
            for (const blocker of data.blockers.map(String)) {
              if (!blockers.includes(blocker)) blockers.push(blocker);
            }
          }
        }
      } catch {
        blockers.push("fastapi_unavailable");
      }
    }

    const supabaseHealth = await this.supabase.health();
    persistenceReady = supabaseHealth.ok;
    if (!persistenceReady) blockers.push("persistence_failed");

    return {
      fastapiReachable,
      supabaseReady: supabaseHealth.ok,
      providerConfigured,
      generationEndpointReady,
      persistenceReady,
      blockers,
      meta: { service: "nestjs-ai-stories-readiness" },
    };
  }

  private async fetchFastapi(url: string, payload: Record<string, unknown>, requestId?: string): Promise<{ ok: true; data: unknown } | { ok: false; failure: StoryFailure }> {
    let lastStatus = 0;
    let lastCode = "fastapi_unavailable";

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 55000);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            ...this.fastapiHeaders(),
            accept: "application/json",
            "content-type": "application/json",
            ...(requestId ? { "x-request-id": requestId } : {}),
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        lastStatus = response.status;
        const data = await response.json().catch(() => null);

        if (response.ok) {
          return { ok: true, data };
        }

        const rawCode = this.extractErrorCode(data);
        lastCode = rawCode;
        if (response.status === 404) {
          return { ok: false, failure: this.failure("fastapi_route_missing", "The FastAPI AI Stories route is not deployed yet.", { fastapiStatus: response.status, fastapiCode: rawCode }) };
        }
        if (response.status === 422) {
          return { ok: false, failure: this.failure("validation_failed", "Please check the story details and try again.", { fastapiStatus: response.status, fastapiCode: rawCode }) };
        }
        if (response.status === 429) {
          return { ok: false, failure: this.failure("rate_limited", "Story generation is rate limited. Please wait a moment and try again.", { fastapiStatus: response.status }) };
        }
        const normalizedCode = rawCode === "ai_provider_failed" ? "provider_failed" : rawCode;
        if (["ai_provider_missing", "all_ai_providers_failed", "provider_failed", "persistence_failed"].includes(normalizedCode)) {
          return { ok: false, failure: this.failure(normalizedCode as StoryFailureCode, this.safeMessage(normalizedCode as StoryFailureCode), { fastapiStatus: response.status, fastapiCode: rawCode, fastapiDiagnostics: this.safeDiagnostics(data) }) };
        }
      } catch {
        lastCode = "fastapi_unavailable";
      }
    }

    return { ok: false, failure: this.failure("fastapi_unavailable", "The story generation service is unavailable. Please try again shortly.", { fastapiStatus: lastStatus, lastCode }) };
  }

  private normalizeSuccess(data: unknown): StoryResponse {
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    if (record.success === false) {
      const rawCode = this.extractErrorCode(record);
      const code = (rawCode === "ai_provider_failed" ? "provider_failed" : rawCode) as StoryFailureCode;
      return this.failure(code, this.safeMessage(code), { fastapiDiagnostics: this.safeDiagnostics(record) });
    }

    const content = String(record.content || "").trim();
    if (!content) {
      return this.failure("provider_failed", "The AI provider did not return usable story text.", { emptyContent: true });
    }

    const wordCount = Number(record.wordCount || record.word_count || content.split(/\s+/).filter(Boolean).length);
    const saved = Boolean(record.saved);
    return {
      success: true,
      storyId: String(record.storyId || record.story_id || record.request_id || randomUUID()),
      title: String(record.title || "AI Story"),
      content,
      provider: String(record.provider || "unknown"),
      model: String(record.model || "unknown"),
      wordCount,
      estimatedReadingMinutes: Number(record.estimatedReadingMinutes || record.estimated_reading_minutes || Math.max(1, Math.ceil(wordCount / 220))),
      saved,
      fallbackUsed: Boolean(record.fallbackUsed || record.fallback_used),
      warnings: Array.isArray(record.warnings) ? record.warnings.map(String) : saved ? [] : ["persistence_not_confirmed"],
      meta: { service: "nestjs-ai-stories-gateway" },
    };
  }

  private async persistStory(body: GenerateAiStoryDto, story: StorySuccess): Promise<Record<string, string>> {
    const { data, error } = await this.supabase
      .schema("app_public")
      .from("ai_stories")
      .insert({
        user_id: body.userId || null,
        concept_id: body.conceptId || null,
        title: story.title,
        prompt: body.prompt,
        content: story.content,
        provider: story.provider,
        model: story.model,
        tone: body.tone,
        length: body.length,
        genre: body.genre || null,
        audience: body.audience || null,
        word_count: story.wordCount,
        status: "ready",
        metadata: {
          provider: story.provider,
          model: story.model,
          fallbackUsed: story.fallbackUsed,
          savedBy: "nestjs-api-gateway",
          warnings: story.warnings,
        },
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return (data || {}) as Record<string, string>;
  }

  private fastapiBaseUrl(): string {
    return String(
      this.config.get<string>("FASTAPI_BASE_URL") ||
        process.env.FASTAPI_BASE_URL ||
        process.env.NEXT_PUBLIC_FASTAPI_BASE_URL ||
        DEFAULT_FASTAPI_BASE_URL,
    )
      .trim()
      .replace(/\/+$/, "");
  }

  private fastapiHeaders(): Record<string, string> {
    const token = String(this.config.get<string>("INTERNAL_SERVICE_TOKEN") || process.env.INTERNAL_SERVICE_TOKEN || "").trim();
    return token ? { "x-internal-service-token": token, authorization: `Bearer ${token}` } : {};
  }

  private extractErrorCode(data: unknown): string {
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    const nested = record.error && typeof record.error === "object" ? (record.error as Record<string, unknown>) : {};
    return String(record.code || nested.code || "ai_provider_failed").toLowerCase();
  }

  private safeDiagnostics(data: unknown): Record<string, unknown> {
    const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    return {
      code: this.extractErrorCode(record),
      provider: typeof record.provider === "string" ? record.provider : undefined,
      providersAttempted: Array.isArray(record.providersAttempted) ? record.providersAttempted.map(String) : undefined,
      providerAttempts: Array.isArray(record.providerAttempts)
        ? record.providerAttempts.map((attempt) => {
            const item = attempt && typeof attempt === "object" ? (attempt as Record<string, unknown>) : {};
            return { provider: String(item.provider || "unknown"), status: String(item.status || "failed") };
          })
        : undefined,
      blockers: Array.isArray(record.blockers) ? record.blockers.map(String) : undefined,
      saved: typeof record.saved === "boolean" ? record.saved : undefined,
    };
  }

  private safeMessage(code: StoryFailureCode): string {
    const messages: Record<StoryFailureCode, string> = {
      ai_provider_missing: "AI story generation is not configured yet. Please contact support.",
      all_ai_providers_failed: "All configured AI providers could not generate the story. Please revise the prompt or try again.",
      provider_failed: "The AI provider could not generate the story. Please revise the prompt or try again.",
      fastapi_route_missing: "The FastAPI AI Stories route is not deployed yet.",
      fastapi_unavailable: "The story generation service is unavailable. Please try again shortly.",
      validation_failed: "Please check the story details and try again.",
      rate_limited: "Story generation is rate limited. Please wait a moment and try again.",
      persistence_failed: "The story was generated, but saving it failed. Please copy the story before leaving this page.",
    };
    return messages[code] || messages.provider_failed;
  }

  private failure(code: StoryFailureCode, message: string, diagnostics: Record<string, unknown>): StoryFailure {
    return {
      success: false,
      code,
      message,
      diagnostics,
      meta: { service: "nestjs-ai-stories-gateway" },
    };
  }
}
