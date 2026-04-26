"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OPS_NAV_ITEMS } from "@/lib/ops/navigation";

export function OpsNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Operations navigation"
      className="rounded-2xl border bg-white p-3 shadow-sm"
    >
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {OPS_NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href ||
            pathname === `/` + item.href.replace(/^\//, "");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-2xl border p-3 transition ${
                active
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <div className="text-sm font-semibold">{item.label}</div>
              <div
                className={`mt-1 text-xs ${
                  active ? "text-neutral-200" : "text-neutral-600"
                }`}
              >
                {item.description}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
