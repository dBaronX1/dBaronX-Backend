import Link from "next/link";

import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
import { getPublicEnv } from "@/lib/env";

export default function SupportPage() {
  const env = getPublicEnv();
  const telegramHref = env.telegramBotLink || (env.telegramBotUsername ? `https://t.me/${env.telegramBotUsername.replace(/^@/, "")}` : "");
  return (
    <DbxSimplePage title="Support" description="Customer-safe support surface for auth, checkout, order, wallet, and referral questions.">
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Need help? Contact support without seeing raw server or environment errors.</p>
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>
        Customer Telegram help supports /shop, /products, /product &lt;handle_or_id&gt;, /cart_help, /checkout_help, /order_status &lt;order_or_email_or_reference&gt;, /payment_status &lt;checkout_session_or_order_ref&gt;, /support, and /contact_support.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/contact_support" style={dbxButtonStyle}>Contact support</Link>
        {telegramHref ? <Link href={telegramHref} style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Telegram support</Link> : null}
      </div>
    </DbxSimplePage>
  );
}
