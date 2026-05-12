import Link from "next/link";

const cardStyle = {
  maxWidth: 760,
  margin: "0 auto",
  border: "1px solid rgba(255,255,255,.14)",
  borderRadius: 28,
  background: "linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.07))",
  boxShadow: "0 24px 80px rgba(0,0,0,.28)",
  padding: 32,
};

const linkStyle = { color: "#fbbf24", fontWeight: 900, textDecoration: "none" };

export default function OnboardingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 20px",
        color: "#f8fafc",
        background:
          "radial-gradient(circle at top left, rgba(244, 63, 94, 0.28), transparent 30%), linear-gradient(135deg, #09090b 0%, #111827 48%, #240b36 100%)",
      }}
    >
      <section style={cardStyle}>
        <p style={{ marginTop: 0, color: "#fde68a", fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>
          dBaronX onboarding
        </p>
        <h1 style={{ margin: "0 0 14px", fontSize: "clamp(34px, 6vw, 58px)", lineHeight: 1 }}>
          Account setup is in progress.
        </h1>
        <p style={{ color: "#cbd5e1", fontSize: 17, lineHeight: 1.7 }}>
          Your confirmed Supabase account is ready for the dBaronX profile, referral, storefront, and dashboard sync. This page does not run first-owner bootstrap and does not create placeholder customer records.
        </p>
        <p style={{ color: "#cbd5e1", fontSize: 17, lineHeight: 1.7 }}>
          Continue to the dashboard or storefront while setup finishes. First-owner referral/reference/invitation creation remains an operator action that happens only after the real user exists.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
          <Link href="/dashboard" style={linkStyle}>Go to dashboard</Link>
          <Link href="/" style={linkStyle}>Browse storefront</Link>
          <a href="mailto:support@dbaronx.com" style={linkStyle}>Contact support</a>
        </div>
      </section>
    </main>
  );
}
