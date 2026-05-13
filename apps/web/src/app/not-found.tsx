import Link from "next/link";
import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";
export default function NotFound() { return <RocketSimplePage title="Rocket page not found" description="This route is not available, but the production storefront is ready."><Link href="/home" style={rocketButtonStyle}>Go home</Link></RocketSimplePage>; }
