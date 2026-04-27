import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createClient,
  SupabaseClient,
} from "@supabase/supabase-js";

type HealthResult = {
  ok: boolean;
  source: "supabase";
  error?: string;
  latencyMs?: number;
};

@Injectable()
export class SupabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SupabaseService.name);
  readonly client: SupabaseClient;

  constructor(private readonly config: ConfigService) {
    const url = this.resolveRequired("SUPABASE_URL");
    const key = this.resolveRequired("SUPABASE_SERVICE_ROLE_KEY");

    this.client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          "x-dbx-service": "dbaronx-api",
        },
      },
    });
  }

  async onModuleInit(): Promise<void> {
    const failFast = this.boolean("SUPABASE_FAIL_FAST", false);

    if (!failFast) {
      return;
    }

    const health = await this.health();

    if (!health.ok) {
      throw new ServiceUnavailableException({
        code: "SUPABASE_NOT_READY",
        message: health.error || "Supabase health check failed",
      });
    }
  }

  onModuleDestroy(): void {
    this.logger.log("Supabase service shutdown complete");
  }


  getClient(): SupabaseClient {
    return this.client;
  }

  getSupabaseClient(): SupabaseClient {
    return this.client;
  }
  schema(schemaName: string): ReturnType<SupabaseClient["schema"]> {
    return this.client.schema(schemaName);
  }

  from(table: string): ReturnType<SupabaseClient["from"]> {
    return this.client.from(table);
  }

  async health(): Promise<HealthResult> {
    const startedAt = Date.now();

    try {
      const { error } = await this.client
        .schema("app_public")
        .from("health_check")
        .select("*")
        .limit(1);

      if (error && !["PGRST116", "42P01"].includes(String(error.code))) {
        return {
          ok: false,
          source: "supabase",
          error: error.message,
          latencyMs: Date.now() - startedAt,
        };
      }

      return {
        ok: true,
        source: "supabase",
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        ok: false,
        source: "supabase",
        error: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startedAt,
      };
    }
  }

  async rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    const { data, error } = await this.client.rpc(functionName, params || {});

    if (error) {
      throw new ServiceUnavailableException({
        code: "SUPABASE_RPC_FAILED",
        message: error.message,
        details: {
          functionName,
          code: error.code,
        },
      });
    }

    return data as T;
  }

  private resolveRequired(key: string): string {
    const value = String(this.config.get<string>(key) || process.env[key] || "").trim();

    if (!value) {
      throw new Error(`Missing required environment variable: ${key}`);
    }

    return value;
  }

  private boolean(key: string, fallback: boolean): boolean {
    const raw = String(this.config.get<string>(key) || process.env[key] || "").toLowerCase();

    if (!raw) return fallback;
    if (["1", "true", "yes", "on"].includes(raw)) return true;
    if (["0", "false", "no", "off"].includes(raw)) return false;

    return fallback;
  }
}