import { Injectable } from "@nestjs/common";
import { FastapiIntelligenceHttpService } from "./fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "./internal-request-headers.service";

export interface FastapiTracePayload {
  flowType: string;
  decisionPayload: Record<string, unknown>;
  requestPayload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FastapiTraceExportService {
  constructor(
    private readonly fastapiHttp: FastapiIntelligenceHttpService,
    private readonly headers: InternalRequestHeadersService,
  ) {}

  async buildDecisionTrace(
    payload: FastapiTracePayload,
    requestId?: string,
    actorId?: string,
  ) {
    const response = await this.fastapiHttp.post<
      {
        decision_trace: {
          flow_type: string;
          trace_hash: string;
          generated_at: string;
          request_payload: Record<string, unknown>;
          decision_payload: Record<string, unknown>;
          metadata: Record<string, unknown>;
        };
      },
      Record<string, unknown>
    >(
      "/decision-trace/build",
      {
        flow_type: payload.flowType,
        decision_payload: payload.decisionPayload,
        request_payload: payload.requestPayload || {},
        metadata: payload.metadata || {},
      },
      this.headers.forAdmin(actorId, requestId),
    );

    return {
      success: true,
      decisionTrace: response.decision_trace,
    };
  }

  async buildRequestAuditEnvelope(
    payload: {
      routePath: string;
      method: string;
      payloadSummary?: Record<string, unknown>;
      responseSummary?: Record<string, unknown>;
      tags?: string[];
    },
    requestId?: string,
    actorId?: string,
  ) {
    const response = await this.fastapiHttp.post<
      {
        request_audit_envelope: {
          generated_at: string;
          route_path: string;
          method: string;
          identity: Record<string, unknown>;
          payload_summary: Record<string, unknown>;
          response_summary: Record<string, unknown>;
          tags: string[];
        };
      },
      Record<string, unknown>
    >(
      "/request-audit-envelope/build",
      {
        route_path: payload.routePath,
        method: payload.method,
        payload_summary: payload.payloadSummary || {},
        response_summary: payload.responseSummary || {},
        tags: payload.tags || [],
      },
      this.headers.forAdmin(actorId, requestId),
    );

    return {
      success: true,
      requestAuditEnvelope: response.request_audit_envelope,
    };
  }
}
