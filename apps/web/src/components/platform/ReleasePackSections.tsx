import { JsonPanel } from "@/components/platform/JsonPanel";

interface ReleasePackSectionsProps {
  pack: {
    frontendClosure: Record<string, unknown>;
    finalLaunchClosure: Record<string, unknown>;
    medusaFinalClosure: Record<string, unknown>;
    deploymentReadiness: Record<string, unknown>;
    startupGate: Record<string, unknown>;
    runtimeContract: Record<string, unknown>;
  };
}

export function ReleasePackSections({ pack }: ReleasePackSectionsProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <JsonPanel title="Frontend Closure" payload={pack.frontendClosure} />
      <JsonPanel title="Final Launch Closure" payload={pack.finalLaunchClosure} />
      <JsonPanel title="Medusa Final Closure" payload={pack.medusaFinalClosure} />
      <JsonPanel title="Deployment Readiness" payload={pack.deploymentReadiness} />
      <JsonPanel title="Startup Gate" payload={pack.startupGate} />
      <JsonPanel title="Runtime Contract" payload={pack.runtimeContract} />
    </section>
  );
}
