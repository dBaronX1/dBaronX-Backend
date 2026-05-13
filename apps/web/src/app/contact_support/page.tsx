import Link from "next/link";
import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";
export default function ContactSupportPage() { return <RocketSimplePage title="Contact support" description="Reach dBaronX support for Rocket storefront and customer account issues."><Link href="mailto:support@dbaronx.com" style={rocketButtonStyle}>Email support</Link></RocketSimplePage>; }
