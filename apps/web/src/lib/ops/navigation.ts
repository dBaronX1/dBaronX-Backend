export interface OpsNavItem {
  href: string;
  label: string;
  description: string;
}

export const OPS_NAV_ITEMS: OpsNavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Unified launch and operations overview",
  },
  {
    href: "/launch",
    label: "Launch",
    description: "Launch closure and FastAPI handoff visibility",
  },
  {
    href: "/ops",
    label: "Ops",
    description: "System launch readiness and core operations",
  },
  {
    href: "/mobile",
    label: "Mobile Lite",
    description: "Low-bandwidth compressed launch surface",
  },
  {
    href: "/affiliate-ops",
    label: "Affiliate",
    description: "Payout review and affiliate operations",
  },
  {
    href: "/watch-ops",
    label: "Watch-to-Earn",
    description: "Watch reward and anti-abuse operations",
  },
  {
    href: "/ads-ops",
    label: "Ads",
    description: "Campaign budget and spend operations",
  },
  {
    href: "/ai-stories-ops",
    label: "AI Stories",
    description: "Campaign and story operations",
  },
  {
    href: "/ai-stories-review",
    label: "AI Review",
    description: "Promotion and campaign review surface",
  },
  {
    href: "/commerce-ops",
    label: "Commerce",
    description: "Commerce mirror and settlement operations",
  },
  {
    href: "/commerce-reconciliation",
    label: "Reconciliation",
    description: "Order, variant, fulfillment and settlement reconciliation",
  },
  {
    href: "/wallet-ops",
    label: "Wallet",
    description: "Wallet, hold and ledger operations",
  },
  {
    href: "/payments-ops",
    label: "Payments",
    description: "Checkout settlement operations",
  },
  {
    href: "/suppliers-ops",
    label: "Suppliers",
    description: "Supplier lifecycle and settlement operations",
  },
  {
    href: "/ads-review",
    label: "Ads Review",
    description: "Campaign review and budget tracking",
  },
];
