export interface FrontendVerificationManifestItem {
  route: string;
  verificationType: "navigation" | "closure" | "ops" | "mobile" | "medusa";
  status: "present";
}

export const FRONTEND_VERIFICATION_MANIFEST: FrontendVerificationManifestItem[] = [
  { route: "/frontend-hub", verificationType: "navigation", status: "present" },
  { route: "/surface-map", verificationType: "navigation", status: "present" },
  { route: "/frontend-mobile-hub", verificationType: "mobile", status: "present" },
  { route: "/dashboard", verificationType: "ops", status: "present" },
  { route: "/launch-gate", verificationType: "closure", status: "present" },
  { route: "/frontend-final-closure", verificationType: "closure", status: "present" },
  { route: "/go-live-decision", verificationType: "closure", status: "present" },
  { route: "/ecommerce-dashboard", verificationType: "ops", status: "present" },
  { route: "/affiliate-dashboard", verificationType: "ops", status: "present" },
  { route: "/watch-dashboard", verificationType: "ops", status: "present" },
  { route: "/ai-stories-dashboard", verificationType: "ops", status: "present" },
  { route: "/medusa-closure-pack", verificationType: "medusa", status: "present" },
  { route: "/medusa-final-closure", verificationType: "medusa", status: "present" },
  { route: "/deployment-readiness", verificationType: "closure", status: "present" },
  { route: "/final-ops-closure", verificationType: "closure", status: "present" },
];
