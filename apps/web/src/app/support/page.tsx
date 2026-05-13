import Link from "next/link";
import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";
export default function SupportPage() { return <RocketSimplePage title="Support" description="Customer-safe support surface for auth, checkout, order, wallet, and referral questions."><p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Need help? Contact support without seeing raw server or environment errors.</p><Link href="/contact_support" style={rocketButtonStyle}>Contact support</Link></RocketSimplePage>; }
