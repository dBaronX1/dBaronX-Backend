#!/usr/bin/env node

const temporaryRenderMedusaStartCommand =
  "sh -c 'pnpm --filter @dbaronx/medusa run start & app_pid=$!; sleep 30; DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt || true; wait $app_pid'";
const normalMedusaStartCommand = 'pnpm --filter @dbaronx/medusa run start';
const productionReadinessStartCommand =
  'pnpm --filter @dbaronx/medusa run shipping:ensure && pnpm --filter @dbaronx/medusa run commerce:ensure && pnpm --filter @dbaronx/medusa start';
const readinessCommand =
  'EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com WEB_BASE_URL="${WEB_BASE_URL:?set current web storefront URL}" pnpm first-product:readiness';

console.log(
  JSON.stringify(
    {
      success: true,
      temporaryRenderMedusaStartCommand,
      normalMedusaStartCommand,
      productionReadinessStartCommand,
      readinessCommand,
      notes: [
        'Paste the temporary command into the Render Medusa Web Service Start Command for a one-time deploy/seed/start cycle; it starts Medusa before running the seed so Render can detect the web port.',
        'After the seed deploy completes, restore the normal Medusa start command and redeploy/restart.',
        'No secrets, DATABASE_URL, CJ token, Stripe key, Telegram token, or Supabase service role key are printed by this helper.',
      ],
    },
    null,
    2,
  ),
);
