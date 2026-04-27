import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { PaymentIntelligenceService } from "./payment-intelligence.service";
import { PaymentPreflightIntelligenceDto } from "./dto/payment-preflight-intelligence.dto";

@Injectable()
export class PaymentPreflightOrchestratorService {
  constructor(
    private readonly paymentIntelligence: PaymentIntelligenceService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async evaluateAndAudit(
    body: PaymentPreflightIntelligenceDto,
    requestId?: string,
  ) {
    const preflight = await this.paymentIntelligence.preflight(body, requestId);
    const decision = preflight.paymentPreflight;
    const allow = isAllowDecision(decision) ? decision.allow : Boolean(decision);

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "payment_preflight",
      routePath: "/api/v1/payments/orchestration/preflight",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: toRecord(decision),
      decisionType: "payment_preflight",
      metadata: {
        orderId: body.orderId,
        accountId: body.accountId,
        currency: body.currency,
      },
      tags: ["payments", "preflight", "risk"],
    });

    if (!allow) {
      throw new BadRequestException({
        success: false,
        message: "Payment preflight not approved",
        decision,
      });
    }

    return {
      success: true,
      approved: true,
      decision,
    };
  }
}

function isAllowDecision(value: unknown): value is { allow: boolean } {
  return typeof value === "object" && value !== null && "allow" in value;
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : { value };
}
