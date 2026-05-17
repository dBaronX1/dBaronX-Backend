import Link from "next/link";

import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export default function CheckoutSuccessPage() {
  return (
    <DbxSimplePage title="Checkout received" description="Your checkout return was received. Confirmed order and payment status will appear only after backend verification.">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link href="/orders" style={dbxButtonStyle}>View orders</Link>
        <Link href="/support" style={{ ...dbxButtonStyle, background: "rgba(255,255,255,.08)", color: "#fff7ed", border: "1px solid rgba(255,255,255,.16)" }}>Need help?</Link>
      </div>
    </DbxSimplePage>
  );
}
