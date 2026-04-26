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

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "payment_preflight",
      routePath: "/api/v1/payments/orchestration/preflight",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: preflight.paymentPreflight as Record<string, unknown>,
      decisionType: "payment_preflight",
      metadata: {
        orderId: body.orderId,
        accountId: body.accountId,
        currency: body.currency,
      },
      tags: ["payments", "preflight", "risk"],
    });

    if (!preflight.paymentPreflight.allow) {
      throw new BadRequestException({
        success: false,
        message: "Payment preflight not approved",
        decision: preflight.paymentPreflight,
      });
    }

    return {
      success: true,
      approved: true,
      decision: preflight.paymentPreflight,
    };
  }
}
