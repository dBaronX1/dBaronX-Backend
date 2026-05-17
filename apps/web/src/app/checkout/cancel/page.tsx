import Link from "next/link";

import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export default function CheckoutCancelPage() {
  return (
    <DbxSimplePage title="Checkout canceled" description="Your checkout was canceled safely. No payment or order state is assumed from this page.">
      <Link href="/shop" style={dbxButtonStyle}>Return to shop</Link>
    </DbxSimplePage>
  );
}
