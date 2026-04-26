import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getLaunchClosurePayload } from "@/lib/launch/launch-closure-api";
import { getMedusaBoundaryProof } from "@/lib/medusa/medusa-boundary-api";
import { getMedusaReconciliationProof } from "@/lib/medusa/medusa-reconciliation-api";

export async function getGoLiveCompositeState() {
  const [frontend, launch, medusaBoundary, medusaReconciliation] =
    await Promise.all([
      getFrontendPhaseClosureState(),
      getLaunchClosurePayload(),
      getMedusaBoundaryProof(),
      getMedusaReconciliationProof(),
    ]);

  const medusaBoundaryReady =
    medusaBoundary.medusaBoundaryProof.forbiddenResponsibilities.length > 0;

  const medusaReconciliationReady =
    Object.values(
      medusaReconciliation.medusaReconciliationProof.reconciliationOwnership,
    ).every((value) => value === "nestjs");

  return {
    frontendClosed: frontend.closed,
    launchClosed: launch.launchClosure.ready,
    medusaBoundaryReady,
    medusaReconciliationReady,
    blockers: [
      ...frontend.blockers,
      ...launch.launchClosure.blockers,
      ...(medusaBoundaryReady ? [] : ["medusa_boundary_not_ready"]),
      ...(medusaReconciliationReady ? [] : ["medusa_reconciliation_not_ready"]),
    ],
  };
}
