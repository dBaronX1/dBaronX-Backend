import {
  BadRequestException,
  Injectable,
} from "@nestjs/common";
import { AffiliateIntelligenceService } from "../affiliate/affiliate-intelligence.service";
import { WalletLedgerService } from "../wallet/wallet-ledger.service";
import { CreatePayoutRequestDto } from "./dto/create-payout-request.dto";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";

@Injectable()
export class PayoutsService {
  constructor(
    private readonly walletLedger: WalletLedgerService,
    private readonly affiliateIntelligence: AffiliateIntelligenceService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async createPayoutRequest(
    body: CreatePayoutRequestDto,
    requestId?: string,
  ) {
    const eligibility = await this.walletLedger.checkPayoutEligibility(
      body.userId,
      body.currency,
      body.amount,
    );

    if (!eligibility.eligible) {
      throw new BadRequestException({
        success: false,
        message: "Payout eligibility failed",
        payoutEligibility: eligibility,
      });
    }

    const risk = await this.affiliateIntelligence.payoutRisk(
      {
        accountId: body.userId,
        payoutAmount: body.amount,
        payoutMethod: body.payoutMethod,
        ip: body.ip,
      } as any,
      requestId,
    );
    const decision = risk.affiliatePayoutRisk;
    const allow = isAllowDecision(decision) ? decision.allow : Boolean(decision);

    await this.intelligenceAudit.persistGuardedDecisionAudit({
      requestId,
      flowType: "payout_request",
      routePath: "/api/v1/payouts/request",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: toRecord(decision),
      decisionType: "payout_request_risk",
      metadata: {
        userId: body.userId,
        payoutMethod: body.payoutMethod,
      },
      tags: ["payout", "affiliate", "risk"],
    });

    if (!allow) {
      throw new BadRequestException({
        success: false,
        message: "Payout request denied by intelligence layer",
        risk: decision,
      });
    }

    return {
      success: true,
      payoutRequest: {
        status: "approved_for_next_step",
        eligibility,
        risk: decision,
      },
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
