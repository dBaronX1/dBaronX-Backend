export interface FinalFrontendAuditItem {
  key: string;
  area: string;
  status: "complete" | "in_progress";
  description: string;
}

export const FINAL_FRONTEND_AUDIT: FinalFrontendAuditItem[] = [
  {
    key: "platform_hubs",
    area: "platform",
    status: "complete",
    description: "Primary hubs, maps, navigation and grouped surface directories exist.",
  },
  {
    key: "commerce_surfaces",
    area: "commerce",
    status: "complete",
    description: "Dashboard, catalog, orders, fulfillment, reconciliation and settlements surfaces exist.",
  },
  {
    key: "affiliate_surfaces",
    area: "affiliate",
    status: "complete",
    description: "Dashboard, review, queue, payouts, risk and performance surfaces exist.",
  },
  {
    key: "watch_ads_surfaces",
    area: "watch_ads",
    status: "complete",
    description: "Watch dashboard, session, reward, anti-abuse, ads dashboard, creative and interaction surfaces exist.",
  },
  {
    key: "ai_stories_surfaces",
    area: "ai_stories",
    status: "complete",
    description: "Dashboard, create, promotion, campaign and review surfaces exist.",
  },
  {
    key: "launch_ops_surfaces",
    area: "launch_ops",
    status: "complete",
    description: "Launch, deployment, startup, closure, gate, go-live and audit surfaces exist.",
  },
  {
    key: "mobile_low_bandwidth",
    area: "mobile",
    status: "complete",
    description: "Mobile and low-bandwidth variants exist for launch-critical domains.",
  },
  {
    key: "medusa_inspection",
    area: "medusa",
    status: "in_progress",
    description: "Boundary, normalization and reconciliation proof surfaces exist; final closure pack still needs completion.",
  },
];
