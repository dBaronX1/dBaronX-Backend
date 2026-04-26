import { getReadinessMatrix } from "@/lib/platform/platform-api";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SectionHeader } from "@/components/platform/SectionHeader";

export const dynamic = "force-dynamic";

export default async function MobileLitePage() {
  const matrix = await getReadinessMatrix();

  const sections = Object.entries(matrix);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-5">
      <SectionHeader
        eyebrow="Mobile Lite"
        title="Low-Bandwidth Launch Surface"
        description="Compressed operational launch surface for smaller screens and reduced-data conditions."
      />

      <LowBandwidthNotice />

      <section className="space-y-3">
        {sections.map(([key, value]) => (
          <article key={key} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </h2>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${
                  value.ready
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {value.ready ? "Ready" : "Blocked"}
              </span>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
