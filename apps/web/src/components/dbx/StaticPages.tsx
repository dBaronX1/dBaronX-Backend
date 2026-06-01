import Link from "next/link";

import { DbxCard, DbxVisualShell, dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
import { CustomerAccountPanel } from "@/components/dbx/CustomerAccountPanel";
import { DbxProductGrid } from "@/components/dbx/ProductViews";
import { fetchRocketStoreProducts } from "@/lib/store-products-server";

const metricCards = [
  ["Verified commerce", "Shop dBaronX products and checkout securely."],
  ["Account access", "Create an account, sign in, and manage your profile."],
  ["dBaronX style", "Dark launch visuals, gold accents, rounded glass cards, and customer-first pages."],
];

export async function DbxHomePage() {
  const initialProducts = (await fetchRocketStoreProducts({ limit: 24 })).products;
  return (
    <DbxVisualShell
      title="dBaronX"
      description="Shop, create an account, view rewards, and contact support from the dBaronX customer portal."
      actions={<><Link href="/shop" style={dbxButtonStyle}>Shop launch products</Link><Link href="/register" style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Create account</Link></>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 18 }}>
        {metricCards.map(([title, text]) => <DbxCard key={title}><h2 style={{ marginTop: 0 }}>{title}</h2><p style={{ color: "#fed7aa", lineHeight: 1.7 }}>{text}</p></DbxCard>)}
      </div>
      <div style={{ height: 20 }} />
      <DbxProductGrid initialProducts={initialProducts} />
    </DbxVisualShell>
  );
}

export function DbxDashboardPage() {
  return (
    <DbxVisualShell title="Customer dashboard" description="Your dBaronX dashboard for shopping, orders, wallet, referrals, and support.">
      <CustomerAccountPanel mode="dashboard" />
      <div style={{ height: 18 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
        {["/shop", "/orders", "/wallet", "/referrals", "/support"].map((href) => <DbxCard key={href}><h2 style={{ marginTop: 0 }}>{href.replace("/", "") || "home"}</h2><Link href={href} style={dbxButtonStyle}>Open</Link></DbxCard>)}
      </div>
    </DbxVisualShell>
  );
}

export function DbxAccountPage({ mode = "account" }: { mode?: "account" | "profile" }) {
  return (
    <DbxVisualShell title={mode === "profile" ? "Profile" : "Account"} description="Manage your dBaronX profile, orders, rewards, referrals, support, and account preferences.">
      <CustomerAccountPanel mode={mode} />
    </DbxVisualShell>
  );
}

export async function DbxShopPage({ handle }: { handle?: string }) {
  const initialProducts = (await fetchRocketStoreProducts({ limit: handle ? 8 : 24, handle })).products;
  return (
    <DbxVisualShell title={handle ? "Product detail" : "Shop"} description="Browse dBaronX products prepared for launch.">
      <DbxProductGrid handle={handle} initialProducts={initialProducts} />
    </DbxVisualShell>
  );
}

export function DbxSimplePage({ title, description, children }: { title: string; description: string; children?: any }) {
  return (
    <DbxVisualShell title={title} description={description}>
      <DbxCard>{children || <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>This dBaronX page is ready for customers.</p>}</DbxCard>
    </DbxVisualShell>
  );
}
