import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getFastapiHandoffPack } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AntiAbusePage() {
  const fastapi = await getFastapiHandoffPack();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Anti-Abuse"
        title="Watch and Ads Anti-Abuse Surface"
        description="Frontend anti-abuse surface for FastAPI enforcement visibility and consumer-readiness context."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/watch-dashboard", label: "Watch Dashboard" },
          { href: "/watch-session", label: "Watch Session" },
          { href: "/anti-abuse", label: "Anti-Abuse" },
          { href: "/ads-interaction", label: "Interaction" },
        ]}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="FastAPI Enforcement"
          payload={fastapi.enforcement}
          description="Backend enforcement state that should remain authoritative for anti-abuse decisions."
        />
        <JsonPanel
          title="Recommended Consumers"
          payload={fastapi.recommended_consumers}
          description="Consumer surfaces expected to respect FastAPI risk and policy outputs."
        />
      </section>
    </main>
  );
}
