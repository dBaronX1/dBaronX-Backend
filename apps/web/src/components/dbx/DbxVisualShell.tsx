import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, HTMLAttributes } from "react";

const navItems = [
  ["Home", "/home"],
  ["Shop", "/shop"],
  ["Products", "/products"],
  ["Dashboard", "/dashboard"],
  ["Account", "/account"],
  ["Support", "/support"],
] as const;

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  color: "#fff7ed",
  background:
    "radial-gradient(circle at 18% 10%, rgba(245,158,11,.38), transparent 28%), radial-gradient(circle at 84% 0%, rgba(249,115,22,.28), transparent 32%), linear-gradient(135deg, #030712 0%, #111827 48%, #431407 100%)",
  fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

export const dbxCardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 28,
  background: "linear-gradient(145deg, rgba(15,23,42,.78), rgba(67,20,7,.48))",
  boxShadow: "0 28px 80px rgba(0,0,0,.36)",
  backdropFilter: "blur(18px)",
};

export const dbxButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  padding: "13px 20px",
  background: "linear-gradient(135deg, #fbbf24, #f97316)",
  color: "#111827",
  fontWeight: 950,
  textDecoration: "none",
  border: "0",
  boxShadow: "0 18px 35px rgba(249,115,22,.28)",
};

export function DbxVisualShell({
  children,
  eyebrow = "dBaronX",
  title,
  description,
  actions,
}: {
  children: any;
  eyebrow?: string;
  title: string;
  description: string;
  actions?: any;
}) {
  return (
    <main style={pageStyle}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid rgba(255,255,255,.10)",
          background: "rgba(3,7,18,.78)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div style={{ margin: "0 auto", maxWidth: 1180, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <Link href="/home" style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "#fff7ed", textDecoration: "none", fontWeight: 950 }}>
            <Image src="/assets/images/app_logo.svg" alt="dBaronX" width={42} height={42} priority />
            <span>dBaronX</span>
          </Link>
          <nav style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }} aria-label="dBaronX navigation">
            {navItems.map(([label, href]) => (
              <Link key={href} href={href} style={{ color: "#fde68a", textDecoration: "none", fontSize: 14, fontWeight: 800, padding: "9px 11px", borderRadius: 999, background: "rgba(255,255,255,.06)" }}>
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <section style={{ margin: "0 auto", maxWidth: 1180, padding: "64px 20px 28px" }}>
        <p style={{ margin: "0 0 12px", color: "#fbbf24", fontWeight: 950, letterSpacing: ".16em", textTransform: "uppercase", fontSize: 12 }}>{eyebrow}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28, alignItems: "end" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(42px, 8vw, 86px)", lineHeight: .92, letterSpacing: "-.06em" }}>{title}</h1>
            <p style={{ margin: "22px 0 0", maxWidth: 700, color: "#fed7aa", fontSize: 19, lineHeight: 1.7 }}>{description}</p>
          </div>
          {actions ? <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "flex-start" }}>{actions}</div> : null}
        </div>
      </section>
      <section style={{ margin: "0 auto", maxWidth: 1180, padding: "0 20px 72px" }}>{children}</section>
    </main>
  );
}

export function DbxCard({ children, style, ...props }: { children: any; style?: CSSProperties } & HTMLAttributes<HTMLDivElement>) {
  return <div {...props} style={{ ...dbxCardStyle, padding: 24, ...style }}>{children}</div>;
}
