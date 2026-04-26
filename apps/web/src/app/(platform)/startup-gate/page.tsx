import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalBanner } from "@/components/platform/OperationalBanner";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getStartupGate } from "@/lib/launch/startup-gate-api";

export const dynamic = "force-dynamic";

export default async function StartupGatePage() {
  const payload = await getStartupGate();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Startup Gate"
        title="Startup Gate Surface"
        description="Launch-hardening surface for strict startup gating before go-live."
      />

      <LowBandwidthNotice />

      <OperationalBanner
        title="Startup gate"
        description={payload.startupGate.note}
        tone={payload.startupGate.passed ? "success" : "warning"}
      />

      <ContractRuleList
        title="Required Startup Checks"
        rules={payload.startupGate.requiredChecks}
      />
    </main>
  );
}
