import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  LedgerEntryInput,
  PayoutEligibilityResult,
  WalletAdjustmentInput,
  WalletBalanceSnapshot,
} from "../../shared/contracts/wallet-ledger.contract";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class WalletLedgerService {
  private readonly logger = new Logger(WalletLedgerService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async getWalletSnapshot(
    userId: string,
    currency: string,
  ): Promise<WalletBalanceSnapshot> {
    const { data, error } = await this.supabase
      .getClient()
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .eq("currency", currency.toUpperCase())
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return {
        userId,
        currency: currency.toUpperCase(),
        availableBalance: 0,
        lockedBalance: 0,
        pendingBalance: 0,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      userId: data.user_id,
      currency: data.currency,
      availableBalance: Number(data.available_balance || 0),
      lockedBalance: Number(data.locked_balance || 0),
      pendingBalance: Number(data.pending_balance || 0),
      updatedAt: data.updated_at || new Date().toISOString(),
    };
  }

  async createLedgerEntry(input: LedgerEntryInput) {
    const wallet = await this.getWalletSnapshot(input.userId, input.currency);

    const nextAvailable =
      input.direction === "credit"
        ? wallet.availableBalance + input.amount
        : wallet.availableBalance - input.amount;

    if (nextAvailable < 0) {
      throw new NotFoundException({
        success: false,
        message: "Insufficient available balance",
        wallet,
      });
    }

    const { error: walletError } = await this.supabase
      .getClient()
      .from("wallets")
      .upsert({
        user_id: input.userId,
        currency: input.currency.toUpperCase(),
        available_balance: nextAvailable,
        locked_balance: wallet.lockedBalance,
        pending_balance: wallet.pendingBalance,
        updated_at: new Date().toISOString(),
      });

    if (walletError) {
      throw walletError;
    }

    const { data, error } = await this.supabase
      .getClient()
      .from("ledger_entries")
      .insert({
        user_id: input.userId,
        currency: input.currency.toUpperCase(),
        amount: input.amount,
        direction: input.direction,
        source: input.source,
        reference_id: input.referenceId,
        reference_type: input.referenceType,
        description: input.description || null,
        metadata: input.metadata || {},
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      throw error;
    }

    this.logger.log(
      `Ledger entry created for user=${input.userId} source=${input.source} amount=${input.amount}`,
    );

    return {
      success: true,
      ledgerEntry: data,
      wallet: await this.getWalletSnapshot(input.userId, input.currency),
    };
  }

  async applyManualAdjustment(input: WalletAdjustmentInput) {
    return this.createLedgerEntry({
      userId: input.userId,
      currency: input.currency,
      amount: input.amount,
      direction: "credit",
      source: "manual_adjustment",
      referenceId: input.actorId || "system",
      referenceType: "manual_adjustment",
      description: input.reason,
      metadata: {
        ...(input.metadata || {}),
        actorId: input.actorId || null,
      },
    });
  }

  async checkPayoutEligibility(
    userId: string,
    currency: string,
    requestedAmount: number,
  ): Promise<PayoutEligibilityResult> {
    const wallet = await this.getWalletSnapshot(userId, currency);
    const blockers: string[] = [];

    if (requestedAmount <= 0) {
      blockers.push("invalid_requested_amount");
    }

    if (wallet.availableBalance < requestedAmount) {
      blockers.push("insufficient_available_balance");
    }

    return {
      eligible: blockers.length === 0,
      blockers,
      availableBalance: wallet.availableBalance,
      requestedAmount,
      currency: wallet.currency,
    };
  }
}
