import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { FRONTEND_SURFACE_GROUPS } from "@/lib/frontend/frontend-surface-groups";

export const dynamic = "force-dynamic";

export default function SurfaceGroupsPage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Surface Groups"
        title="Frontend Surface Grouping Surface"
        description="Grouped view of frontend operational surfaces to support final hardening, route verification, and launch audit."
      />

      <LowBandwidthNotice />

      <section className="grid gap-4 lg:grid-cols-2">
        {FRONTEND_SURFACE_GROUPS.map((group) => (
          <article key={group.title} className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold">{group.title}</h2>
            <p className="mt-1 text-sm text-neutral-600">{group.description}</p>

            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              {group.routes.map((route) => (
                <li key={route} className="rounded-xl bg-neutral-50 px-3 py-2">
                  {route}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
