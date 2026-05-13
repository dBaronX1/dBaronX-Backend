import Link from "next/link";
import { DbxSimplePage } from "@/components/dbx/StaticPages";
import { dbxButtonStyle } from "@/components/dbx/DbxVisualShell";
export default function NotFound() { return <DbxSimplePage title="Page not found" description="This route is not available, but the production storefront is ready."><Link href="/home" style={dbxButtonStyle}>Go home</Link></DbxSimplePage>; }
