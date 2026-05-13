import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function ContactPage() { return <DbxSimplePage title="Contact" description="Contact the dBaronX team for account, order, and product support."><Link href="mailto:support@dbaronx.com" style={dbxButtonStyle}>Email support</Link></DbxSimplePage>; }
