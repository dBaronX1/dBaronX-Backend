import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";

export const dynamic = "force-dynamic";

export default function CheckoutUnavailablePage() {
  return <DbxSimplePage title="Checkout unavailable" description="Secure checkout is temporarily unavailable."><p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Checkout is temporarily unavailable. Please try again.</p><Link href="/cart" style={dbxButtonStyle}>Return to cart</Link></DbxSimplePage>;
}
