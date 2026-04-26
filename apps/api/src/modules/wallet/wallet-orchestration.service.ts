import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { IntelligenceAuditPipelineService } from "../../shared/services/intelligence-audit-pipeline.service";
import { SupabaseService } from "../../shared/services/supabase.service";
import { WalletLedgerService } from "./wallet-ledger.service";
import { WalletHoldDto } from "./dto/wallet-hold.dto";
import { WalletReleaseDto } from "./dto/wallet-release.dto";
import { WalletSettlementDto } from "./dto/wallet-settlement.dto";

@Injectable()
export class WalletOrchestrationService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly walletLedger: WalletLedgerService,
    private readonly intelligenceAudit: IntelligenceAuditPipelineService,
  ) {}

  async holdFunds(body: WalletHoldDto, requestId?: string) {
    const wallet = await this.walletLedger.getWalletSnapshot(
      body.userId,
      body.currency,
    );

    if (wallet.availableBalance < body.amount) {
      throw new BadRequestException({
        success: false,
        message: "Insufficient available balance for hold",
        wallet,
      });
    }

    const nextAvailable = wallet.availableBalance - body.amount;
    const nextLocked = wallet.lockedBalance + body.amount;

    const { error: walletError } = await this.supabase
      .getClient()
      .from("wallets")
      .upsert({
        user_id: body.userId,
        currency: body.currency.toUpperCase(),
        available_balance: nextAvailable,
        locked_balance: nextLocked,
        pending_balance: wallet.pendingBalance,
        updated_at: new Date().toISOString(),
      });

    if (walletError) {
      throw walletError;
    }

    const { data: hold, error: holdError } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .insert({
        user_id: body.userId,
        currency: body.currency.toUpperCase(),
        amount: body.amount,
        reference_id: body.referenceId,
        reference_type: body.referenceType,
        status: "held",
        reason: body.reason || null,
        metadata: body.metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (holdError) {
      throw holdError;
    }

    await this.walletLedger.createLedgerEntry({
      userId: body.userId,
      currency: body.currency,
      amount: body.amount,
      direction: "debit",
      source: "manual_adjustment",
      referenceId: body.referenceId,
      referenceType: "wallet_hold",
      description: body.reason || "Wallet hold created",
      metadata: {
        ...(body.metadata || {}),
        holdId: hold.id,
        holdStage: "created",
      },
    });

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "wallet_hold",
      routePath: "/api/v1/wallet/hold",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: hold as Record<string, unknown>,
      metadata: {
        userId: body.userId,
        currency: body.currency,
      },
      tags: ["wallet", "hold", "funds"],
    });

    return {
      success: true,
      hold,
      wallet: await this.walletLedger.getWalletSnapshot(
        body.userId,
        body.currency,
      ),
    };
  }

  async releaseFunds(body: WalletReleaseDto, requestId?: string) {
    const { data: hold, error } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("id", body.holdId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!hold) {
      throw new NotFoundException({
        success: false,
        message: "Wallet hold not found",
      });
    }

    if (hold.status !== "held") {
      throw new BadRequestException({
        success: false,
        message: "Wallet hold is not releasable",
        hold,
      });
    }

    const wallet = await this.walletLedger.getWalletSnapshot(
      hold.user_id,
      hold.currency,
    );

    const nextAvailable = wallet.availableBalance + Number(hold.amount || 0);
    const nextLocked = Math.max(wallet.lockedBalance - Number(hold.amount || 0), 0);

    const { error: walletError } = await this.supabase
      .getClient()
      .from("wallets")
      .upsert({
        user_id: hold.user_id,
        currency: hold.currency,
        available_balance: nextAvailable,
        locked_balance: nextLocked,
        pending_balance: wallet.pendingBalance,
        updated_at: new Date().toISOString(),
      });

    if (walletError) {
      throw walletError;
    }

    const { data: releasedHold, error: releaseError } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .update({
        status: "released",
        released_by: body.actorId || null,
        release_reason: body.reason || null,
        metadata: {
          ...(hold.metadata || {}),
          ...(body.metadata || {}),
          releasedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.holdId)
      .select("*")
      .single();

    if (releaseError) {
      throw releaseError;
    }

    await this.walletLedger.createLedgerEntry({
      userId: hold.user_id,
      currency: hold.currency,
      amount: Number(hold.amount || 0),
      direction: "credit",
      source: "manual_adjustment",
      referenceId: hold.reference_id,
      referenceType: "wallet_hold_release",
      description: body.reason || "Wallet hold released",
      metadata: {
        ...(body.metadata || {}),
        holdId: hold.id,
        releaseStage: "completed",
      },
    });

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "wallet_release",
      routePath: "/api/v1/wallet/release",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: releasedHold as Record<string, unknown>,
      metadata: {
        holdId: body.holdId,
        actorId: body.actorId || null,
      },
      tags: ["wallet", "release", "funds"],
    });

    return {
      success: true,
      hold: releasedHold,
      wallet: await this.walletLedger.getWalletSnapshot(
        hold.user_id,
        hold.currency,
      ),
    };
  }

  async settleHeldFunds(body: WalletSettlementDto, requestId?: string) {
    const { data: hold, error } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .select("*")
      .eq("id", body.holdId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!hold) {
      throw new NotFoundException({
        success: false,
        message: "Wallet hold not found",
      });
    }

    if (hold.status !== "held") {
      throw new BadRequestException({
        success: false,
        message: "Wallet hold is not settleable",
        hold,
      });
    }

    const wallet = await this.walletLedger.getWalletSnapshot(
      hold.user_id,
      hold.currency,
    );

    const nextLocked = Math.max(wallet.lockedBalance - Number(hold.amount || 0), 0);

    const { error: walletError } = await this.supabase
      .getClient()
      .from("wallets")
      .upsert({
        user_id: hold.user_id,
        currency: hold.currency,
        available_balance: wallet.availableBalance,
        locked_balance: nextLocked,
        pending_balance: wallet.pendingBalance,
        updated_at: new Date().toISOString(),
      });

    if (walletError) {
      throw walletError;
    }

    const { data: settledHold, error: settledError } = await this.supabase
      .getClient()
      .from("wallet_holds")
      .update({
        status: "settled",
        settled_by: body.actorId || null,
        settlement_reference_id: body.settlementReferenceId || null,
        settlement_reference_type: body.settlementReferenceType || null,
        settlement_reason: body.reason || null,
        metadata: {
          ...(hold.metadata || {}),
          ...(body.metadata || {}),
          settledAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.holdId)
      .select("*")
      .single();

    if (settledError) {
      throw settledError;
    }

    await this.intelligenceAudit.persistDecisionAudit({
      requestId,
      flowType: "wallet_settlement",
      routePath: "/api/v1/wallet/settlement",
      method: "POST",
      requestPayload: body as unknown as Record<string, unknown>,
      decisionPayload: settledHold as Record<string, unknown>,
      metadata: {
        holdId: body.holdId,
        actorId: body.actorId || null,
        settlementReferenceId: body.settlementReferenceId || null,
      },
      tags: ["wallet", "settlement", "funds"],
    });

    return {
      success: true,
      hold: settledHold,
      wallet: await this.walletLedger.getWalletSnapshot(
        hold.user_id,
        hold.currency,
      ),
    };
  }
}
