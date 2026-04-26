export interface FrontendNavigationAuditItem {
  href: string;
  category: string;
  purpose: string;
}

export const FRONTEND_NAVIGATION_AUDIT: FrontendNavigationAuditItem[] = [
  { href: "/frontend-hub", category: "hub", purpose: "primary frontend directory" },
  { href: "/surface-map", category: "hub", purpose: "domain surface directory" },
  { href: "/dashboard", category: "ops", purpose: "unified operations overview" },
  { href: "/launch", category: "launch", purpose: "launch closure visibility" },
  { href: "/launch-gate", category: "launch", purpose: "go/no-go gating" },
  { href: "/launch-summary", category: "launch", purpose: "progress summary" },
  { href: "/ecommerce-dashboard", category: "commerce", purpose: "storefront commerce overview" },
  { href: "/storefront-catalog", category: "commerce", purpose: "catalog readiness" },
  { href: "/storefront-orders", category: "commerce", purpose: "order operations" },
  { href: "/payments", category: "payments", purpose: "payment states" },
  { href: "/affiliate-dashboard", category: "affiliate", purpose: "affiliate overview" },
  { href: "/affiliate-review-queue", category: "affiliate", purpose: "review queue" },
  { href: "/watch-dashboard", category: "watch", purpose: "watch readiness" },
  { href: "/watch-session", category: "watch", purpose: "session lifecycle" },
  { href: "/ads-dashboard", category: "ads", purpose: "campaign metrics" },
  { href: "/ai-stories-dashboard", category: "ai-stories", purpose: "story operations" },
  { href: "/campaign-studio", category: "campaigns", purpose: "campaign drafting" },
  { href: "/medusa-final-closure", category: "medusa", purpose: "medusa closure" },
  { href: "/deployment-hardening", category: "launch-ops", purpose: "deployment hardening" },
  { href: "/go-live-decision", category: "launch-ops", purpose: "final release decision" },
];
