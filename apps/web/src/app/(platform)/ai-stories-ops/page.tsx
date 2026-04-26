import { getAiStoriesAdminDashboard } from "@/lib/platform/platform-api";

export const dynamic = "force-dynamic";

export default async function AiStoriesOpsPage() {
  const dashboard = await getAiStoriesAdminDashboard();

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-neutral-500">
          AI Stories Operations
        </p>
        <h1 className="text-3xl font-bold tracking-tight">
          Campaign and Story Operations Surface
        </h1>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-600">Total Campaigns</p>
          <p className="mt-2 text-3xl font-bold">{dashboard.totalCampaigns}</p>
        </article>

        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-neutral-600">Total Stories</p>
          <p className="mt-2 text-3xl font-bold">{dashboard.totalStories}</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Campaign Status Counts</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(dashboard.campaignStatusCounts, null, 2)}
          </pre>
        </article>

        <article className="rounded-2xl border bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold">Recent Campaigns</h2>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-neutral-50 p-3 text-xs text-neutral-700">
            {JSON.stringify(dashboard.recentCampaigns.slice(0, 10), null, 2)}
          </pre>
        </article>
      </section>
    </main>
  );
}
