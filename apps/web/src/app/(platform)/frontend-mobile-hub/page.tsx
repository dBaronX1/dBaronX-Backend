import Link from "next/link";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default function FrontendMobileHubPage() {
  const items = [
    { href: "/mobile", label: "Launch Mobile" },
    { href: "/storefront-mobile", label: "Storefront Mobile" },
    { href: "/affiliate-mobile", label: "Affiliate Mobile" },
    { href: "/watch-mobile", label: "Watch Mobile" },
    { href: "/ai-stories-mobile", label: "AI Stories Mobile" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <SectionHeader
        eyebrow="Frontend Mobile Hub"
        title="Mobile Launch Surface Directory"
        description="Compressed mobile-first directory across launch, storefront, affiliate, watch-to-earn, and AI Stories."
      />

      <LowBandwidthNotice />

      <section className="space-y-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl border bg-white px-4 py-4 text-sm font-medium shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            {item.label}
          </Link>
        ))}
      </section>
    </main>
  );
}
