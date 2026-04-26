import type {
  FastapiHandoffPack,
  LaunchClosure,
  PlatformAdminPack,
} from "@/lib/platform/backend-contracts";
import { StatusPill } from "@/components/platform/StatusPill";

export function BackendHealthSummary({
  launch,
  fastapi,
  platform,
}: {
  launch: LaunchClosure;
  fastapi: FastapiHandoffPack;
  platform: PlatformAdminPack;
}) {
  const checks = [
    { label: "Launch", ready: launch.ready },
    { label: "FastAPI", ready: fastapi.closed },
    { label: "FastAPI Enforcement", ready: fastapi.enforcement.closed },
    { label: "Platform Shell", ready: platform.shell.ready },
  ];

  return (
    <section className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Backend Health Summary</h2>
        <p className="text-sm text-neutral-600">
          Cross-system backend contract visibility for frontend launch surfaces.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {checks.map((check) => (
          <article key={check.label} className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">{check.label}</p>
              <StatusPill ready={check.ready} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
