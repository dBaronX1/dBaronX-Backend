import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { ShellClosureCard } from "@/components/platform/ShellClosureCard";
import { getSystemShellClosure } from "@/lib/ops/ops-snapshot-api";

export const dynamic = "force-dynamic";

export default async function ShellClosurePage() {
  const payload = await getSystemShellClosure();
  const shell = payload.shellClosure;

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Shell Closure"
        title="System Shell Closure Surface"
        description="Frontend shell-closure surface for platform shell, admin, readiness, and final blocker visibility."
      />

      <LowBandwidthNotice />

      <ShellClosureCard closed={shell.closed} blockers={shell.blockers} />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Platform Shell" payload={shell.platformShell} />
        <JsonPanel title="Admin Ops" payload={shell.adminOps} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Admin Summary" payload={shell.adminSummary} />
        <JsonPanel title="Readiness Matrix" payload={shell.readinessMatrix} />
      </section>
    </main>
  );
}
