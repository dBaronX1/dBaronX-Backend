export interface ReleaseRiskItem {
  key: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
}

export const RELEASE_RISKS: ReleaseRiskItem[] = [
  {
    key: "env_validation",
    severity: "high",
    title: "Environment validation incomplete",
    description: "Deployment readiness still reports unresolved environment and connectivity checks.",
  },
  {
    key: "startup_gate",
    severity: "high",
    title: "Startup gate not passed",
    description: "Final startup gate remains blocked until launch-hardening checks pass.",
  },
  {
    key: "medusa_boundary",
    severity: "medium",
    title: "Medusa bridge requires final closure proof",
    description: "Commerce-only boundary and reconciliation proofs must remain visible and intact.",
  },
  {
    key: "frontend_closure",
    severity: "medium",
    title: "Frontend closure still under final hardening",
    description: "Frontend surfaces are strong but still in the final hardening and audit phase.",
  },
];
