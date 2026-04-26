"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface SurfaceTab {
  href: string;
  label: string;
}

export function SurfaceTabs({ tabs }: { tabs: SurfaceTab[] }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-full px-3 py-2 text-sm font-medium transition ${
              active
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
