import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";

const remainingWork = [
  {
    domain: "Frontend cleanup",
    status: "late-stage hardening",
    focus: "route audit, closure confirmation, verification surfaces, canonical brief alignment",
  },
  {
    domain: "Medusa closure",
    status: "near-closed",
    focus: "final closure confirmation, reconciliation proof alignment, final closure pack consistency",
  },
  {
    domain: "Ops closure",
    status: "near-closed",
    focus: "finalization readiness, verification pack, deployment/startup closure confirmation",
  },
];

export const dynamic = "force-dynamic";

export default function RemainingWorkPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Remaining Work"
        title="Remaining Hardening Work Surface"
        description="Late-stage summary of the remaining hardening zones after major subsystem construction has been completed."
      />

      <LowBandwidthNotice />

      <OperationalTable
        title="Remaining Work Domains"
        rows={remainingWork}
        columns={[
          {
            key: "domain",
            title: "Domain",
            render: (row) => <span>{row.domain}</span>,
          },
          {
            key: "status",
            title: "Status",
            render: (row) => <span>{row.status}</span>,
          },
          {
            key: "focus",
            title: "Focus",
            render: (row) => <span>{row.focus}</span>,
          },
        ]}
      />
    </main>
  );
}
