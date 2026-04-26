import { ContractRuleList } from "@/components/platform/ContractRuleList";
import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { getRuntimeContract } from "@/lib/launch/runtime-contract-api";

export const dynamic = "force-dynamic";

export default async function RuntimeContractPage() {
  const payload = await getRuntimeContract();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Runtime Contract"
        title="Runtime Contract Surface"
        description="Runtime contract inspection for late-stage launch sequencing across NestJS, FastAPI, Medusa, frontend, and Telegram."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel title="Runtime Services" payload={payload.runtimeContract.services} />
        <ContractRuleList title="Runtime Rules" rules={payload.runtimeContract.rules} />
      </section>
    </main>
  );
}
