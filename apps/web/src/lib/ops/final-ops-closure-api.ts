import { getFinalLaunchClosure } from "@/lib/launch/final-launch-closure-api";
import { getMedusaFinalClosurePack } from "@/lib/medusa/medusa-final-closure-api";
import { getFrontendPhaseClosureState } from "@/lib/frontend/frontend-handoff-api";
import { getStartupGate } from "@/lib/launch/startup-gate-api";

export async function getFinalOpsClosureState() {
  const [frontend, launch, medusa, startupGate] = await Promise.all([
    getFrontendPhaseClosureState(),
    getFinalLaunchClosure(),
    getMedusaFinalClosurePack(),
    getStartupGate(),
  ]);

  const closed =
    frontend.closed &&
    launch.finalLaunchClosure.closed &&
    medusa.medusaFinalClosurePack.closed &&
    startupGate.startupGate.passed;

  return {
    closed,
    frontend,
    launch: launch.finalLaunchClosure,
    medusa: medusa.medusaFinalClosurePack,
    startupGate: startupGate.startupGate,
    blockers: [
      ...frontend.blockers,
      ...(launch.finalLaunchClosure.closed ? [] : ["final_launch_closure_open"]),
      ...(medusa.medusaFinalClosurePack.closed ? [] : ["medusa_final_closure_open"]),
      ...(startupGate.startupGate.passed ? [] : ["startup_gate_not_passed"]),
    ],
  };
}
