import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";

const cleanupItems = [
  {
    area: "Frontend routes",
    action: "Confirm all launch-critical routes remain reachable and linked",
    state: "active",
  },
  {
    area: "Frontend closure",
    action: "Confirm backend-backed closure surfaces align",
    state: "active",
  },
  {
    area: "Medusa closure",
    action: "Confirm boundary, reconciliation and closure pack remain aligned",
    state: "active",
  },
  {
    area: "Ops closure",
    action: "Confirm deployment, startup, runtime and final ops closure remain aligned",
    state: "active",
  },
  {
    area: "Canonical brief",
    action: "Use final canonical brief as the last completion-facing surface",
    state: "active",
  },
];

export const dynamic = "force-dynamic";

export default function FinalCleanupPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Final Cleanup"
        title="Final Cleanup and Confirmation Surface"
        description="Last-stage cleanup tracker across frontend, Medusa, ops, and canonical completion brief."
      />

      <LowBandwidthNotice />

      <OperationalTable
        title="Cleanup Items"
        rows={cleanupItems}
        columns={[
          {
            key: "area",
            title: "Area",
            render: (row) => <span>{row.area}</span>,
          },
          {
            key: "action",
            title: "Action",
            render: (row) => <span>{row.action}</span>,
          },
          {
            key: "state",
            title: "State",
            render: (row) => <span>{row.state}</span>,
          },
        ]}
      />
    </main>
  );
}
