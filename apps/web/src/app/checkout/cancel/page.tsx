import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function CheckoutCancelPage() { return <DbxSimplePage title="Checkout canceled" description="Your checkout was canceled safely. No raw payment or server details are exposed."><Link href="/shop" style={dbxButtonStyle}>Return to shop</Link></DbxSimplePage>; }
