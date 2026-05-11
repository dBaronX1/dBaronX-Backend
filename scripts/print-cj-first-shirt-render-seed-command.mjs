#!/usr/bin/env node

const temporaryRenderMedusaStartCommand =
  'DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa first-product:seed:cj-shirt && pnpm --filter @dbaronx/medusa start';
const normalMedusaStartCommand = 'pnpm --filter @dbaronx/medusa start';
const readinessCommand =
  'EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa.onrender.com WEB_BASE_URL=https://dbaronx.com pnpm first-product:readiness';

console.log(
  JSON.stringify(
    {
      success: true,
      temporaryRenderMedusaStartCommand,
      normalMedusaStartCommand,
      readinessCommand,
      notes: [
        'Paste the temporary command into the Render Medusa service Start Command for a one-time deploy/seed/start cycle.',
        'After the seed deploy completes, restore the normal Medusa start command and redeploy/restart.',
        'No secrets, DATABASE_URL, CJ token, Stripe key, Telegram token, or Supabase service role key are printed by this helper.',
      ],
    },
    null,
    2,
  ),
);
