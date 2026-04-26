import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";
import { StartupAuditLogService } from "../../shared/services/startup-audit-log.service";

@Injectable()
export class SystemLaunchAuditTrailService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async snapshot() {
    const [tracesResult, readinessResult] = await Promise.all([
      this.supabase
        .getClient()
        .from("intelligence_audit_traces")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      this.supabase
        .getClient()
        .from("system_launch_readiness_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (tracesResult.error) {
      throw tracesResult.error;
    }

    if (readinessResult.error) {
      throw readinessResult.error;
    }

    return {
      success: true,
      launchAuditTrail: {
        startupAudit: {
          entries: this.startupAudit.getEntries(),
          summary: this.startupAudit.getSummary(),
        },
        intelligenceAuditTraces: tracesResult.data || [],
        readinessSnapshots: readinessResult.data || [],
      },
    };
  }
}
