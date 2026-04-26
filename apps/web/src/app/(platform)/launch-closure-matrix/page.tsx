import { ReadinessGrid } from "@/components/platform/ReadinessGrid";
import { LaunchStatusBanner } from "@/components/platform/LaunchStatusBanner";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { SurfaceHero } from "@/components/platform/SurfaceHero";
import { getLaunchClosure, getReadinessMatrix } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function LaunchClosureMatrixPage() {
  const [launch, matrix] = await Promise.all([
    getLaunchClosure(),
    getReadinessMatrix(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SurfaceHero
        eyebrow="Launch Matrix"
        title="Launch Closure Matrix Surface"
        description="Frontend matrix surface for launch blockers and readiness distribution across economic, commerce, ads, AI stories, and operational domains."
      />

      <LowBandwidthNotice />
      <LaunchStatusBanner ready={launch.ready} blockers={launch.blockers} />
      <ReadinessGrid matrix={matrix} />
    </main>
  );
}
