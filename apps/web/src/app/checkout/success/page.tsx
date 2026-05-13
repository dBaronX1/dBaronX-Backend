import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function CheckoutSuccessPage() { return <DbxSimplePage title="Checkout success" description="Your checkout completed. Order confirmation and fulfillment updates will appear in your account."><Link href="/orders" style={dbxButtonStyle}>View orders</Link></DbxSimplePage>; }
