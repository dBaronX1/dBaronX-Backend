"use client";
import Link from "next/link";
import { RocketSimplePage } from "@/components/rocket/StaticPages";
import { rocketButtonStyle } from "@/components/rocket/RocketShell";
export default function ErrorPage() { return <RocketSimplePage title="Something needs a retry" description="We could not load this Rocket surface. Please try again or contact support."><Link href="/support" style={rocketButtonStyle}>Get support</Link></RocketSimplePage>; }
