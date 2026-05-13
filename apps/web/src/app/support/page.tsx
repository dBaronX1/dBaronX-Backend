import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function SupportPage() { return <DbxSimplePage title="Support" description="Customer-safe support surface for auth, checkout, order, wallet, and referral questions."><p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Need help? Contact support without seeing raw server or environment errors.</p><Link href="/contact_support" style={dbxButtonStyle}>Contact support</Link></DbxSimplePage>; }
