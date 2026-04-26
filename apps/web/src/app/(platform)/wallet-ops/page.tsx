import { getPlatformAdminPack } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalMetricCard } from "@/components/platform/OperationalMetricCard";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { JsonPanel } from "@/components/platform/JsonPanel";

export const dynamic = "force-dynamic";

export default async function WalletOpsPage() {
  const pack = await getPlatformAdminPack();
  const wallet = (pack.summary?.wallet ?? {}) as Record<string, unknown>;
  const totals = (wallet.totals ?? {}) as Record<string, unknown>;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Wallet Operations"
        title="Wallet, Hold, and Ledger Surface"
        description="Operational wallet surface for available, locked, pending, hold, and ledger visibility."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OperationalMetricCard
          label="Wallets"
          value={String(wallet.walletCount ?? 0)}
        />
        <OperationalMetricCard
          label="Holds"
          value={String(wallet.holdCount ?? 0)}
        />
        <OperationalMetricCard
          label="Ledger Entries"
          value={String(wallet.ledgerEntryCount ?? 0)}
        />
        <OperationalMetricCard
          label="Available Balance"
          value={String(totals.available ?? 0)}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <JsonPanel title="Hold Status Counts" payload={wallet.holdStatusCounts ?? {}} />
        <JsonPanel title="Ledger Source Counts" payload={wallet.ledgerSourceCounts ?? {}} />
        <JsonPanel title="Recent Holds" payload={wallet.recentHolds ?? []} />
      </section>
    </main>
  );
}
