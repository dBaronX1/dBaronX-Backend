import Link from "next/link";

import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
import { getPublicEnv } from "@/lib/env";

export default function ContactPage() {
  const env = getPublicEnv();
  const telegramHref = env.telegramBotLink || (env.telegramBotUsername ? `https://t.me/${env.telegramBotUsername.replace(/^@/, "")}` : "");
  return (
    <DbxSimplePage title="Contact" description="Contact the dBaronX team for account, order, and product support.">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="mailto:support@dbaronx.com" style={dbxButtonStyle}>Email support</Link>
        {telegramHref ? <Link href={telegramHref} style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Telegram support</Link> : null}
      </div>
    </DbxSimplePage>
  );
}
