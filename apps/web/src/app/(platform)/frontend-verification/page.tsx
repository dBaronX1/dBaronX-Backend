import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { FRONTEND_VERIFICATION_MANIFEST } from "@/lib/frontend/frontend-verification-manifest";

export const dynamic = "force-dynamic";

export default function FrontendVerificationPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Verification"
        title="Frontend Verification Manifest Surface"
        description="Verification manifest for critical frontend launch and closure routes."
      />

      <LowBandwidthNotice />

      <OperationalTable
        title="Verification Manifest"
        rows={FRONTEND_VERIFICATION_MANIFEST}
        columns={[
          {
            key: "route",
            title: "Route",
            render: (row) => <span>{row.route}</span>,
          },
          {
            key: "verificationType",
            title: "Verification Type",
            render: (row) => <span>{row.verificationType}</span>,
          },
          {
            key: "status",
            title: "Status",
            render: (row) => <span>{row.status}</span>,
          },
        ]}
      />
    </main>
  );
}
