"use client";
import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function ErrorPage() { return <DbxSimplePage title="Something needs a retry" description="We could not load this page. Please try again or contact support."><Link href="/support" style={dbxButtonStyle}>Get support</Link></DbxSimplePage>; }
