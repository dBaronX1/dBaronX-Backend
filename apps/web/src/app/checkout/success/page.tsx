import Link from "next/link";
import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";
export default function CheckoutSuccessPage() { return <RocketSimplePage title="Checkout success" description="Your Rocket checkout completed. Order confirmation and fulfillment updates will appear in your account."><Link href="/orders" style={rocketButtonStyle}>View orders</Link></RocketSimplePage>; }
