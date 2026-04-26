import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { internalApiRequest } from "@/lib/http/internal-api-client";

export const dynamic = "force-dynamic";

interface MedusaClosurePayload {
  medusaSyncContract: Record<string, unknown>;
  medusaFulfillmentNormalizationPolicy: Record<string, unknown>;
}

export default async function MedusaClosurePage() {
  const payload = await internalApiRequest<MedusaClosurePayload>(
    "/api/v1/commerce/sync-contract",
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Medusa Closure"
        title="Commerce-Only Boundary and Sync Contract Surface"
        description="Frontend inspection surface for Medusa commerce-only boundaries, sync contracts, and fulfillment normalization rules."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        <JsonPanel
          title="Medusa Sync Contract"
          payload={payload.medusaSyncContract}
        />
        <JsonPanel
          title="Fulfillment Normalization Policy"
          payload={payload.medusaFulfillmentNormalizationPolicy}
        />
      </section>
    </main>
  );
}
