import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StatusPill } from "@/components/platform/StatusPill";
import { FINAL_FRONTEND_AUDIT } from "@/lib/frontend/final-frontend-audit";

export const dynamic = "force-dynamic";

export default function FrontendAuditPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Frontend Audit"
        title="Final Frontend Audit Surface"
        description="Audit view of major frontend launch surfaces and what is fully present versus still finishing."
      />

      <LowBandwidthNotice />

      <OperationalTable
        title="Frontend Completion Audit"
        rows={FINAL_FRONTEND_AUDIT}
        columns={[
          {
            key: "area",
            title: "Area",
            render: (row) => <span>{row.area}</span>,
          },
          {
            key: "status",
            title: "Status",
            render: (row) => (
              <StatusPill
                ready={row.status === "complete"}
                readyLabel="Complete"
                blockedLabel="In Progress"
              />
            ),
          },
          {
            key: "description",
            title: "Description",
            render: (row) => <span>{row.description}</span>,
          },
        ]}
      />
    </main>
  );
}
