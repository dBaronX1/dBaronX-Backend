#!/usr/bin/env node
const normalStartCommand = 'pnpm --filter @dbaronx/medusa run start';
const jobOnlySeedCommand = 'DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt';
const readinessCommand = 'EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com API_BASE_URL=https://dbaronx-api-unified-qo2j.onrender.com FASTAPI_BASE_URL=https://dbaronx-fastapi-5ci9.onrender.com BOT_BASE_URL=https://dbaronx-telegram-bot.onrender.com WEB_BASE_URL="${WEB_BASE_URL:?set current web storefront URL}" pnpm first-product:readiness';
console.log(JSON.stringify({
  medusaWebServicePolicy: 'Never run seed/import jobs in the Render Medusa Web Service Start Command; startup must bind the HTTP port quickly.',
  normalStartCommand,
  readinessPreflightPolicy: 'Run shipping:ensure and commerce:ensure as explicit jobs or workflow steps, never as the Render Web Service Start Command.',
  jobOnlySeedCommand,
  seedExecutionPaths: ['GitHub Action: Medusa First Product Seed', 'Render one-off job', 'Render shell'],
  readinessCommand,
}, null, 2));
