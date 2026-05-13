import Link from "next/link";
import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";
export default function CheckoutCancelPage() { return <RocketSimplePage title="Checkout canceled" description="Your checkout was canceled safely. No raw payment or server details are exposed."><Link href="/shop" style={rocketButtonStyle}>Return to shop</Link></RocketSimplePage>; }
