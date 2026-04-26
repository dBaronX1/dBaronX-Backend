import type { ReleaseReadinessScore } from "@/lib/release/release-readiness-score";

export function ReleaseReadinessScoreCard({
  result,
}: {
  result: ReleaseReadinessScore;
}) {
  const toneClass =
    result.verdict === "ready"
      ? "border-emerald-300 bg-emerald-50"
      : result.verdict === "nearly_ready"
        ? "border-sky-300 bg-sky-50"
        : "border-amber-300 bg-amber-50";

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${toneClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Release Readiness Score</h2>
          <p className="text-sm text-neutral-700">
            Composite score across final closure domains.
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{result.percentage}%</p>
          <p className="text-xs uppercase tracking-wide text-neutral-600">
            {result.verdict}
          </p>
        </div>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/60">
        <div
          className="h-full rounded-full bg-neutral-900"
          style={{ width: `${result.percentage}%` }}
          aria-label="Release readiness score"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={result.percentage}
          role="progressbar"
        />
      </div>

      <p className="mt-3 text-sm text-neutral-700">
        {result.score}/{result.maxScore} critical closure domains are currently passing.
      </p>
    </section>
  );
}
