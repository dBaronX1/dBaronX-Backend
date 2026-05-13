import type { ReactNode } from "react";
import Link from "next/link";

import { RocketCard, RocketShell, rocketButtonStyle } from "@/components/rocket/RocketShell";
import { CustomerAccountPanel } from "@/components/rocket/CustomerAccountPanel";
import { RocketProductGrid } from "@/components/rocket/ProductViews";

const metricCards = [
  ["Verified commerce", "Medusa Store API powered product browsing and checkout handoff."],
  ["Runtime auth", "Supabase public config is loaded safely at runtime for Fly production."],
  ["Rocket design", "Dark launch visuals, gold accents, rounded glass cards, and customer-first copy."],
];

export function RocketHomePage() {
  return (
    <RocketShell
      title="Rocket commerce, live on dBaronX."
      description="A production storefront and customer portal inspired by the Rocket visual source, wired to the existing dBaronX backend integrations."
      actions={<><Link href="/shop" style={rocketButtonStyle}>Shop launch products</Link><Link href="/register" style={{ ...rocketButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Create account</Link></>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
        {metricCards.map(([title, text]) => <RocketCard key={title}><h2 style={{ marginTop: 0 }}>{title}</h2><p style={{ color: "#fed7aa", lineHeight: 1.7 }}>{text}</p></RocketCard>)}
      </div>
    </RocketShell>
  );
}

export function RocketDashboardPage() {
  return (
    <RocketShell title="Customer dashboard" description="Your Rocket command center for shopping, orders, wallet readiness, referrals, and support.">
      <CustomerAccountPanel mode="dashboard" />
      <div style={{ height: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
        {["/shop", "/orders", "/wallet", "/referrals", "/support"].map((href) => <RocketCard key={href}><h2 style={{ marginTop: 0 }}>{href.replace("/", "") || "home"}</h2><Link href={href} style={rocketButtonStyle}>Open</Link></RocketCard>)}
      </div>
    </RocketShell>
  );
}

export function RocketAccountPage({ mode = "account" }: { mode?: "account" | "profile" }) {
  return (
    <RocketShell title={mode === "profile" ? "Profile" : "Account"} description="Secure customer account surfaces preserve Supabase Auth behavior and hide raw runtime errors from customers.">
      <CustomerAccountPanel mode={mode} />
    </RocketShell>
  );
}

export function RocketShopPage({ handle }: { handle?: string }) {
  return (
    <RocketShell title={handle ? "Product detail" : "Rocket shop"} description="Live Medusa Store API product cards use SVG fallbacks when supplier imagery is unavailable.">
      <RocketProductGrid handle={handle} />
    </RocketShell>
  );
}

export function RocketSimplePage({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return (
    <RocketShell title={title} description={description}>
      <RocketCard>{children || <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>This Rocket-styled surface is ready for production traffic and keeps customer-facing messages safe.</p>}</RocketCard>
    </RocketShell>
  );
}
