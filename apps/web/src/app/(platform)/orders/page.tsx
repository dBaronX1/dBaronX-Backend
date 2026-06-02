import Link from "next/link";

import { CustomerOrderStatusLookup } from "@/components/dbx/CustomerOrderStatusLookup";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export default function OrdersPage() {
  return (
    <DbxSimplePage title="Orders" description="Track order status and checkout outcomes from the customer portal.">
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Orders remain connected to verified checkout and payment confirmation records. Sign in for customer-specific history.</p>
      <CustomerOrderStatusLookup />
      <div style={{ height: 12 }} />
      <Link href="/account" style={dbxButtonStyle}>Open account</Link>
    </DbxSimplePage>
  );
}
