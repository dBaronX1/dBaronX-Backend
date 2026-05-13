import Link from "next/link";

import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export default function OrdersPage() {
  return (
    <DbxSimplePage title="Orders" description="Track order status and checkout outcomes from the customer portal.">
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Orders remain connected to dBaronX backend commerce integrations. Sign in for customer-specific history.</p>
      <Link href="/account" style={dbxButtonStyle}>Open account</Link>
    </DbxSimplePage>
  );
}
