import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletOrchestrationService } from "../wallet/wallet-orchestration.service";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { CreatePayoutRequestDto } from "./dto/create-payout-request.dto";
import { WalletLedgerService } from "../wallet/wallet-ledger.service";

@Injectable()
export class PayoutLifecycleService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletOrchestration: WalletOrchestrationService,
    private readonly walletLedger: WalletLedgerService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async request(body: CreatePayoutRequestDto, requestId?: string) {
    await this.walletOrchestration.holdFunds(
      {
        userId: body.userId,
        currency: body.currency,
        amount: body.amount,
        referenceId: body.userId,
        referenceType: "payout_request",
        reason: `Payout request hold: ${body.payoutMethod}`,
        metadata: {
          payoutMethod: body.payoutMethod,
          ip: body.ip,
        },
      },
      requestId,
    );

    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .insert({
        user_id: body.userId,
        currency: body.currency.toUpperCase(),
        amount: body.amount,
        payout_method: body.payoutMethod,
        ip: body.ip,
        status: "held_for_review",
        actor_id: body.actorId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    return {
      success: true,
      payoutRequest: data,
    };
  }

  async approve(
    payoutRequestId: string,
    actorId?: string,
    requestId?: string,
  ) {
    const payout = await this.getPayoutRequestOrThrow(payoutRequestId);

    if (payout.status !== "held_for_review") {
      throw new BadRequestException({
        success: false,
        message: "Payout request is not approvable",
        payout,
      });
    }

    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .update({
        status: "approved",
        approved_by: actorId || null,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutRequestId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "payout_approval",
      routePath: "/api/v1/payouts/approve",
      method: "POST",
      requestPayload: {
        payoutRequestId,
        actorId: actorId || null,
      },
      decisionPayload: data,
      metadata: {
        stage: "approved",
      },
      tags: ["payout", "approval"],
    });

    return {
      success: true,
      payoutRequest: data,
    };
  }

  async settle(
    payoutRequestId: string,
    actorId?: string,
    externalReference?: string,
    requestId?: string,
  ) {
    const payout = await this.getPayoutRequestOrThrow(payoutRequestId);

    if (payout.status !== "approved") {
      throw new BadRequestException({
        success: false,
        message: "Payout request is not settleable",
        payout,
      });
    }

    const { data: hold } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("user_id", payout.user_id)
      .eq("reference_type", "payout_request")
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!hold) {
      throw new NotFoundException({
        success: false,
        message: "Associated wallet hold not found",
      });
    }

    await this.walletOrchestration.settleHeldFunds(
      {
        holdId: hold.id,
        actorId,
        settlementReferenceId: externalReference || payout.id,
        settlementReferenceType: "payout_settlement",
        reason: "Payout settled",
      },
      requestId,
    );

    await this.walletLedger.createLedgerEntry({
      userId: payout.user_id,
      currency: payout.currency,
      amount: Number(payout.amount),
      direction: "debit",
      source: "affiliate_payout",
      referenceId: payout.id,
      referenceType: "payout_settlement",
      description: `Payout settled via ${payout.payout_method}`,
      metadata: {
        externalReference: externalReference || null,
        settledBy: actorId || null,
      },
    });

    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .update({
        status: "settled",
        settled_by: actorId || null,
        settlement_reference: externalReference || null,
        settled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutRequestId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "payout_settlement",
      routePath: "/api/v1/payouts/settle",
      method: "POST",
      requestPayload: {
        payoutRequestId,
        actorId: actorId || null,
        externalReference: externalReference || null,
      },
      decisionPayload: data,
      metadata: {
        stage: "settled",
      },
      tags: ["payout", "settlement"],
    });

    return {
      success: true,
      payoutRequest: data,
    };
  }

  async reject(
    payoutRequestId: string,
    actorId?: string,
    reason?: string,
    requestId?: string,
  ) {
    const payout = await this.getPayoutRequestOrThrow(payoutRequestId);

    if (!["held_for_review", "approved"].includes(payout.status)) {
      throw new BadRequestException({
        success: false,
        message: "Payout request is not rejectable",
        payout,
      });
    }

    const { data: hold } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("user_id", payout.user_id)
      .eq("reference_type", "payout_request")
      .eq("status", "held")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (hold) {
      await this.walletOrchestration.releaseFunds(
        {
          holdId: hold.id,
          actorId,
          reason: reason || "Payout rejected",
        },
        requestId,
      );
    }

    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .update({
        status: "rejected",
        rejected_by: actorId || null,
        rejection_reason: reason || null,
        rejected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", payoutRequestId)
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "payout_rejection",
      routePath: "/api/v1/payouts/reject",
      method: "POST",
      requestPayload: {
        payoutRequestId,
        actorId: actorId || null,
        reason: reason || null,
      },
      decisionPayload: data,
      metadata: {
        stage: "rejected",
      },
      tags: ["payout", "rejection"],
    });

    return {
      success: true,
      payoutRequest: data,
    };
  }

  private async getPayoutRequestOrThrow(payoutRequestId: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from("payout_requests")
      .select("*")
      .eq("id", payoutRequestId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotFoundException({
        success: false,
        message: "Payout request not found",
      });
    }

    return data;
  }
}
