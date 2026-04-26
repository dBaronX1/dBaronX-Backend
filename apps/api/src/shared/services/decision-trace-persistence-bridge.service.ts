import { Injectable, Logger } from "@nestjs/common";
import { SupabaseService } from "./supabase.service";
import { FastapiTraceExportService } from "./fastapi-trace-export.service";

export interface PersistDecisionTraceInput {
  flowType: string;
  routePath: string;
  method: string;
  actorId?: string;
  requestId?: string;
  requestPayload?: Record<string, unknown>;
  decisionPayload: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

@Injectable()
export class DecisionTracePersistenceBridgeService {
  private readonly logger = new Logger(
    DecisionTracePersistenceBridgeService.name,
  );

  constructor(
    private readonly supabase: SupabaseService,
    private readonly fastapiTraceExport: FastapiTraceExportService,
  ) {}

  async persist(input: PersistDecisionTraceInput) {
    const trace = await this.fastapiTraceExport.buildDecisionTrace(
      {
        flowType: input.flowType,
        requestPayload: input.requestPayload,
        decisionPayload: input.decisionPayload,
        metadata: input.metadata,
      },
      input.requestId,
      input.actorId,
    );

    const envelope = await this.fastapiTraceExport.buildRequestAuditEnvelope(
      {
        routePath: input.routePath,
        method: input.method,
        payloadSummary: input.requestPayload,
        responseSummary: input.decisionPayload,
        tags: input.tags,
      },
      input.requestId,
      input.actorId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("intelligence_audit_traces")
      .insert({
        flow_type: input.flowType,
        request_id: input.requestId || null,
        actor_id: input.actorId || null,
        trace_hash: trace.decisionTrace.trace_hash,
        trace_payload: trace.decisionTrace,
        envelope_payload: envelope.requestAuditEnvelope,
        metadata: input.metadata || {},
        tags: input.tags || [],
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      this.logger.error(
        `Failed to persist decision trace bridge: ${error.message}`,
      );
      throw error;
    }

    return {
      success: true,
      auditTrace: data,
      decisionTrace: trace.decisionTrace,
      requestAuditEnvelope: envelope.requestAuditEnvelope,
    };
  }
}
