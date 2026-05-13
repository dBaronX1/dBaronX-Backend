import Link from "next/link";

import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";

export default function OrdersPage() {
  return (
    <RocketSimplePage title="Orders" description="Track Rocket order status and checkout outcomes from the customer portal.">
      <p style={{ color: "#fed7aa", lineHeight: 1.7 }}>Orders remain connected to dBaronX backend commerce integrations. Sign in for customer-specific history.</p>
      <Link href="/account" style={rocketButtonStyle}>Open account</Link>
    </RocketSimplePage>
  );
}
