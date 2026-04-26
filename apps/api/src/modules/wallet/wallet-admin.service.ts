import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../shared/services/supabase.service";

@Injectable()
export class WalletAdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async dashboard() {
    const [walletsResult, holdsResult, ledgerResult] = await Promise.all([
      this.supabase
        .getClient()
        .from("wallets")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("wallet_holds")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      this.supabase
        .getClient()
        .from("ledger_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (walletsResult.error) throw walletsResult.error;
    if (holdsResult.error) throw holdsResult.error;
    if (ledgerResult.error) throw ledgerResult.error;

    const wallets = walletsResult.data || [];
    const holds = holdsResult.data || [];
    const ledgerEntries = ledgerResult.data || [];

    const totals = wallets.reduce(
      (acc, wallet) => {
        acc.available += Number(wallet.available_balance || 0);
        acc.locked += Number(wallet.locked_balance || 0);
        acc.pending += Number(wallet.pending_balance || 0);
        return acc;
      },
      { available: 0, locked: 0, pending: 0 },
    );

    const holdStatusCounts = holds.reduce<Record<string, number>>((acc, hold) => {
      const key = String(hold.status || "unknown");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const ledgerSourceCounts = ledgerEntries.reduce<Record<string, number>>(
      (acc, entry) => {
        const key = String(entry.source || "unknown");
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      },
      {},
    );

    return {
      success: true,
      walletAdmin: {
        walletCount: wallets.length,
        holdCount: holds.length,
        ledgerEntryCount: ledgerEntries.length,
        totals,
        holdStatusCounts,
        ledgerSourceCounts,
        recentWallets: wallets.slice(0, 25),
        recentHolds: holds.slice(0, 25),
        recentLedgerEntries: ledgerEntries.slice(0, 25),
      },
    };
  }
}
