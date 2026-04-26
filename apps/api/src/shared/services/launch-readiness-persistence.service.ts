import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";

export interface PersistLaunchReadinessInput {
  requestId?: string;
  source: string;
  status: "ready" | "degraded" | "not_ready";
  payload: Record<string, unknown>;
  blockers?: string[];
}

@Injectable()
export class LaunchReadinessPersistenceService {
  private readonly logger = new Logger(LaunchReadinessPersistenceService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async persist(input: PersistLaunchReadinessInput) {
    const { data, error } = await this.supabase
      .getClient()
      .from("system_launch_readiness_snapshots")
      .insert({
        request_id: input.requestId || null,
        source: input.source,
        status: input.status,
        blockers: input.blockers || [],
        payload: input.payload,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      this.logger.error(
        `Failed to persist launch readiness snapshot: ${error.message}`,
      );
      throw error;
    }

    return {
      success: true,
      snapshot: data,
    };
  }
}
