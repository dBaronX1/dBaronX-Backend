export interface FrontendSurfaceGroup {
  title: string;
  routes: string[];
  description: string;
}

export const FRONTEND_SURFACE_GROUPS: FrontendSurfaceGroup[] = [
  {
    title: "Commerce",
    description: "Storefront, catalog, orders, fulfillment, reconciliation, settlements",
    routes: [
      "/ecommerce-dashboard",
      "/storefront-catalog",
      "/storefront-orders",
      "/orders",
      "/payments",
      "/fulfillment",
      "/commerce-reconciliation",
      "/settlements",
    ],
  },
  {
    title: "Affiliate",
    description: "Dashboard, review, risk, payouts, performance",
    routes: [
      "/affiliate-dashboard",
      "/affiliate-review",
      "/affiliate-review-queue",
      "/affiliate-risk",
      "/affiliate-payouts",
      "/affiliate-performance",
    ],
  },
  {
    title: "Watch / Ads",
    description: "Watch dashboards, anti-abuse, ads dashboards, creatives, interactions",
    routes: [
      "/watch-dashboard",
      "/watch-review",
      "/watch-session",
      "/watch-reward",
      "/anti-abuse",
      "/ads-dashboard",
      "/ads-review",
      "/ads-creative",
      "/ads-interaction",
    ],
  },
  {
    title: "AI Stories",
    description: "Create, review, promotion, campaign detail, performance",
    routes: [
      "/ai-stories-dashboard",
      "/ai-stories-create",
      "/ai-stories-review",
      "/ai-stories-promotion",
      "/campaign-performance",
      "/campaign-studio",
    ],
  },
  {
    title: "Launch Ops",
    description: "Launch, closure, deployment, environment, go-live",
    routes: [
      "/launch",
      "/launch-gate",
      "/launch-summary",
      "/frontend-final-closure",
      "/deployment-hardening",
      "/deployment-checklist",
      "/environment-readiness",
      "/go-live-decision",
      "/final-launch-pack",
    ],
  },
];
