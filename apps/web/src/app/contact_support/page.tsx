import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function ContactSupportPage() { return <DbxSimplePage title="Contact support" description="Reach dBaronX support for dBaronX storefront and customer account issues."><Link href="mailto:support@dbaronx.com" style={dbxButtonStyle}>Email support</Link></DbxSimplePage>; }
