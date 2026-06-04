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

  async generate(
    body: GenerateAiStoryDto,
    requestId?: string,
  ): Promise<StoryResponse> {
    const fastapiBaseUrl = this.fastapiBaseUrl();

    if (!fastapiBaseUrl) {
      return this.failure(
        "fastapi_unavailable",
        "Story generation is temporarily unavailable. Please try again.",
        {
          blocker: "ai_service_base_url_missing",
        },
      );
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

    const fastapiResponse = await this.fetchFastapi(
      this.fastapiPaths("generate"),
      payload,
      requestId,
    );

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
        warnings: normalized.warnings.filter(
          (warning) => warning !== "persistence_not_confirmed",
        ),
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
        warnings: Array.from(
          new Set([...normalized.warnings, "persistence_failed"]),
        ),
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
      const readiness = await this.fetchFastapiReadiness();
      fastapiReachable = readiness.fastapiReachable;
      providerConfigured = readiness.providerConfigured;
      generationEndpointReady = readiness.generationEndpointReady;
      blockers.push(...readiness.blockers);
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
      meta: { service: "ai-stories-readiness" },
    };
  }

  private async fetchFastapi(
    urls: string[],
    payload: Record<string, unknown>,
    requestId?: string,
  ): Promise<
    { ok: true; data: unknown } | { ok: false; failure: StoryFailure }
  > {
    let lastStatus = 0;
    let lastCode = "fastapi_unavailable";

    for (const url of urls) {
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
          lastCode = "fastapi_route_missing";
          continue;
        }
        if (response.status === 422) {
          return {
            ok: false,
            failure: this.failure(
              "validation_failed",
              "Please check the story details and try again.",
              { aiServiceStatus: response.status, aiServiceCode: rawCode },
            ),
          };
        }
        if (response.status === 429) {
          return {
            ok: false,
            failure: this.failure(
              "rate_limited",
              "Story generation is rate limited. Please wait a moment and try again.",
              { aiServiceStatus: response.status },
            ),
          };
        }
        const normalizedCode =
          rawCode === "ai_provider_failed" ? "provider_failed" : rawCode;
        if (
          [
            "ai_provider_missing",
            "all_ai_providers_failed",
            "provider_failed",
            "persistence_failed",
          ].includes(normalizedCode)
        ) {
          return {
            ok: false,
            failure: this.failure(
              normalizedCode as StoryFailureCode,
              this.safeMessage(normalizedCode as StoryFailureCode),
              {
                aiServiceStatus: response.status,
                aiServiceCode: rawCode,
                aiServiceDiagnostics: this.safeDiagnostics(data),
              },
            ),
          };
        }
      } catch {
        lastCode = "fastapi_unavailable";
      }
    }

    if (lastCode === "fastapi_route_missing") {
      return {
        ok: false,
        failure: this.failure(
          "fastapi_route_missing",
          "Story generation is temporarily unavailable. Please try again.",
          { aiServiceStatus: lastStatus, lastCode },
        ),
      };
    }

    return {
      ok: false,
      failure: this.failure(
        "fastapi_unavailable",
        "The story generation service is unavailable. Please try again shortly.",
        { aiServiceStatus: lastStatus, lastCode },
      ),
    };
  }

  private normalizeSuccess(data: unknown): StoryResponse {
    const record = this.unwrapFastapiEnvelope(data);
    if (record.success === false) {
      const rawCode = this.extractErrorCode(record);
      const code = (
        rawCode === "ai_provider_failed" ? "provider_failed" : rawCode
      ) as StoryFailureCode;
      return this.failure(code, this.safeMessage(code), {
        aiServiceDiagnostics: this.safeDiagnostics(record),
      });
    }

    const content = String(
      record.content || record.story || record.text || "",
    ).trim();
    if (!content) {
      return this.failure(
        "provider_failed",
        this.safeMessage("provider_failed"),
        { emptyContent: true },
      );
    }

    const wordCount = Number(
      record.wordCount ||
        record.word_count ||
        content.split(/\s+/).filter(Boolean).length,
    );
    const saved = Boolean(record.saved);
    return {
      success: true,
      storyId: String(
        record.storyId || record.story_id || record.request_id || randomUUID(),
      ),
      title: String(record.title || "AI Story"),
      content,
      provider: String(record.provider || "unknown"),
      model: String(record.model || "unknown"),
      wordCount,
      estimatedReadingMinutes: Number(
        record.estimatedReadingMinutes ||
          record.estimated_reading_minutes ||
          Math.max(1, Math.ceil(wordCount / 220)),
      ),
      saved,
      fallbackUsed: Boolean(record.fallbackUsed || record.fallback_used),
      warnings: Array.isArray(record.warnings)
        ? record.warnings.map(String)
        : saved
          ? []
          : ["persistence_not_confirmed"],
      meta: { service: "ai-stories-gateway" },
    };
  }

  private async persistStory(
    body: GenerateAiStoryDto,
    story: StorySuccess,
  ): Promise<Record<string, string>> {
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

    if (error) throw new Error("ai_story_persistence_failed");
    return (data || {}) as Record<string, string>;
  }

  private fastapiBaseUrl(): string {
    return this.fastapiBaseUrlCandidates()[0] || "";
  }

  private fastapiBaseUrlCandidates(): string[] {
    return Array.from(
      new Set(
        [
          this.config.get<string>("FASTAPI_BASE_URL"),
          process.env.FASTAPI_BASE_URL,
          process.env.FASTAPI_URL,
          process.env.FASTAPI_PUBLIC_BASE_URL,
          process.env.NEXT_PUBLIC_FASTAPI_BASE_URL,
          DEFAULT_FASTAPI_BASE_URL,
        ]
          .map((value) =>
            String(value || "")
              .trim()
              .replace(/\/+$/, ""),
          )
          .filter((value) => value.length > 0),
      ),
    );
  }

  private fastapiPaths(kind: "generate" | "readiness"): string[] {
    const suffixes =
      kind === "generate"
        ? [
            "/ai/stories/generate",
            "/stories/ai-stories/generate",
            "/ai/generate",
          ]
        : [
            "/ai/stories/readiness",
            "/stories/ai-stories/readiness",
            "/ai-stories/readiness",
          ];
    return this.fastapiBaseUrlCandidates().flatMap((baseUrl) =>
      suffixes.map((suffix) => `${baseUrl}${suffix}`),
    );
  }

  private async fetchFastapiReadiness(): Promise<{
    fastapiReachable: boolean;
    providerConfigured: boolean;
    generationEndpointReady: boolean;
    blockers: string[];
  }> {
    const blockers: string[] = [];
    let fastapiReachable = false;
    let providerConfigured = false;
    let generationEndpointReady = false;

    for (const url of this.fastapiPaths("readiness")) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
          headers: this.fastapiHeaders(),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await response.json().catch(() => ({}));
        if (response.status === 404) {
          if (!blockers.includes("fastapi_route_missing"))
            blockers.push("fastapi_route_missing");
          continue;
        }
        if (!response.ok) {
          if (!blockers.includes("fastapi_unavailable"))
            blockers.push("fastapi_unavailable");
          continue;
        }
        fastapiReachable = true;
        providerConfigured = Boolean(
          data?.providerConfigured || data?.provider_configured,
        );
        generationEndpointReady = Boolean(
          data?.generationEndpointReady || data?.generation_endpoint_ready,
        );
        if (!providerConfigured) blockers.push("ai_provider_missing");
        if (Array.isArray(data?.blockers)) {
          for (const blocker of data.blockers.map(String)) {
            if (!blockers.includes(blocker)) blockers.push(blocker);
          }
        }
        return {
          fastapiReachable,
          providerConfigured,
          generationEndpointReady,
          blockers: blockers.filter(
            (blocker) =>
              blocker !== "fastapi_unavailable" &&
              blocker !== "fastapi_route_missing",
          ),
        };
      } catch {
        if (!blockers.includes("fastapi_unavailable"))
          blockers.push("fastapi_unavailable");
      }
    }

    return {
      fastapiReachable,
      providerConfigured,
      generationEndpointReady,
      blockers,
    };
  }

  private fastapiHeaders(): Record<string, string> {
    const token = String(
      this.config.get<string>("INTERNAL_SERVICE_TOKEN") ||
        process.env.INTERNAL_SERVICE_TOKEN ||
        "",
    ).trim();
    return token
      ? { "x-internal-service-token": token, authorization: `Bearer ${token}` }
      : {};
  }

  private unwrapFastapiEnvelope(data: unknown): Record<string, unknown> {
    const record =
      data && typeof data === "object" ? (data as Record<string, unknown>) : {};
    if (record.data && typeof record.data === "object") {
      const data = record.data as Record<string, unknown>;
      const nestedData =
        data.data && typeof data.data === "object"
          ? (data.data as Record<string, unknown>)
          : data;
      return {
        ...data,
        ...nestedData,
        content:
          nestedData.content ||
          nestedData.story ||
          nestedData.text ||
          data.content ||
          data.story ||
          data.text,
      };
    }
    return {
      ...record,
      content: record.content || record.story || record.text,
    };
  }

  private extractErrorCode(data: unknown): string {
    const record = this.unwrapFastapiEnvelope(data);
    const nested =
      record.error && typeof record.error === "object"
        ? (record.error as Record<string, unknown>)
        : {};
    return String(
      record.code || nested.code || "ai_provider_failed",
    ).toLowerCase();
  }

  private safeDiagnostics(data: unknown): Record<string, unknown> {
    const record = this.unwrapFastapiEnvelope(data);
    return {
      code: this.extractErrorCode(record),
      provider:
        typeof record.provider === "string" ? record.provider : undefined,
      providersAttempted: Array.isArray(record.providersAttempted)
        ? record.providersAttempted.map(String)
        : undefined,
      providerAttempts: Array.isArray(record.providerAttempts)
        ? record.providerAttempts.map((attempt) => {
            const item =
              attempt && typeof attempt === "object"
                ? (attempt as Record<string, unknown>)
                : {};
            return {
              provider: String(item.provider || "unknown"),
              status: String(item.status || "failed"),
            };
          })
        : undefined,
      blockers: Array.isArray(record.blockers)
        ? record.blockers.map(String)
        : undefined,
      saved: typeof record.saved === "boolean" ? record.saved : undefined,
    };
  }

  private safeMessage(code: StoryFailureCode): string {
    const messages: Record<StoryFailureCode, string> = {
      ai_provider_missing:
        "Story generation is temporarily unavailable. Please try again.",
      all_ai_providers_failed:
        "Story generation is temporarily unavailable. Please try again.",
      provider_failed:
        "Story generation is temporarily unavailable. Please try again.",
      fastapi_route_missing:
        "Story generation is temporarily unavailable. Please try again.",
      fastapi_unavailable:
        "Story generation is temporarily unavailable. Please try again.",
      validation_failed: "Please check the story details and try again.",
      rate_limited:
        "Story generation is rate limited. Please wait a moment and try again.",
      persistence_failed:
        "The story was generated, but saving it failed. Please copy the story before leaving this page.",
    };
    return messages[code] || messages.provider_failed;
  }

  private failure(
    code: StoryFailureCode,
    message: string,
    diagnostics: Record<string, unknown>,
  ): StoryFailure {
    return {
      success: false,
      code,
      message,
      diagnostics,
      meta: { service: "ai-stories-gateway" },
    };
  }
}
