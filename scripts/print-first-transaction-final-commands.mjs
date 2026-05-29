#!/usr/bin/env node

const commandPack = {
  success: true,
  blockers: [],
  firstSalePriority: true,
  warnings: [
    'build-only image push is not a Fly release: flyctl deploy --build-only --push builds and pushes an image but does not roll a new runtime release.',
    'Medusa Admin /app is not required for the first sale while the admin build is disabled; Store API products/regions readiness is the commerce gate.',
    'Medusa / root returning Cannot GET is not a Store API failure; validate /store/products and /store/regions with the fresh publishable key.',
    'Do not open checkout to customers until all readiness smokes are green and the Stripe session is cs_test_* for the controlled first transaction.',
  ],
  sections: {
    'A. Medusa normal Render start command': {
      renderService: 'dbaronx-medusa',
      startCommand:
        'pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start',
      purpose:
        'Normal commerce-only Medusa startup for Render after the one-cycle seed is complete.',
    },
    'B. Medusa full publishable-key print command': {
      command:
        'DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true pnpm --filter @dbaronx/medusa run publishable-key:print',
      allowedOutputFields: [
        'success',
        'blockers',
        'publishableApiKeyId',
        'publishableApiKeyToken',
        'publishableApiKeyTokenPreview',
        'salesChannelId',
        'linked',
        'storeProductsAccessible',
        'storeRegionsAccessible',
        'nextManualStep',
      ],
      safety:
        'This is the only command in this pack that may print the Medusa publishable Store API key, and only because it requires explicit DBX_CONFIRM_PRINT_MEDUSA_PUBLISHABLE_KEY=true operator confirmation.',
    },
    'C. Medusa one-cycle CJ shirt seed command': {
      renderTemporaryStartCommand:
        'DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt && pnpm --filter @dbaronx/medusa start',
      localOneOffCommand:
        'DBX_CONFIRM_CJ_FIRST_PRODUCT_SEED=true pnpm --filter @dbaronx/medusa run first-product:seed:cj-shirt',
      controlledProduct: {
        title: "Men's Cotton Linen Long Sleeve Casual Shirt",
        handle: 'mens-cotton-linen-long-sleeve-casual-shirt',
        supplier: 'cj',
        supplierProductId: '2408300732091605000',
        supplierSku: 'CJDS212420104DW',
        costMinorUnits: 419,
        sellingPriceMinorUnits: 1999,
        stockQty: 32,
        shippingCountries: ['US'],
        deliveryEstimate: '7-15 business days',
      },
      safety:
        'Use the temporary Render start command for exactly one deploy/seed/start cycle, then restore the normal command.',
    },
    'D. Normal Medusa command to restore/keep': {
      command:
        'pnpm --filter @dbaronx/medusa run db:prepare && pnpm --filter @dbaronx/medusa run launch-commerce:ensure && pnpm --filter @dbaronx/medusa start',
      restoreAfter:
        'Restore this command immediately after the controlled CJ shirt seed succeeds once.',
    },
    'E. Env vars to update after key print': {
      updateWithPublishableApiKeyTokenOnly: [
        'MEDUSA_PUBLISHABLE_KEY=<publishableApiKeyToken from confirmed print command>',
        'NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishableApiKeyToken from confirmed print command>',
        'PUBLIC_MEDUSA_PUBLISHABLE_KEY=<publishableApiKeyToken from confirmed print command>',
      ],
      doNotPrintOrCommit: [
        'DATABASE_URL',
        'STRIPE_SECRET_KEY',
        'STRIPE_WEBHOOK_SECRET',
        'SUPABASE_SERVICE_ROLE_KEY',
        'TELEGRAM_BOT_TOKEN',
        'CJ_ACCESS_TOKEN',
        'INTERNAL_SERVICE_TOKEN',
      ],
    },
    'F. Fly actual release commands for Telegram/FastAPI/Web': {
      actualReleases: [
        'pnpm deploy:fly:telegram',
        'pnpm deploy:fly:fastapi',
        'pnpm deploy:fly:web',
        'pnpm deploy:fly:runtime-services',
      ],
      buildOnlyImagePushesNotReleases: [
        'pnpm deploy:fly:telegram:build-only',
        'pnpm deploy:fly:fastapi:build-only',
        'pnpm deploy:fly:web:build-only',
      ],
      note:
        'Use actual release scripts before runtime readiness. Build-only scripts are provided only when an operator intentionally wants to prebuild and push images.',
    },
    'G. Local readiness smoke commands': [
      'pnpm runtime:fly:readiness',
      'EXPECT_SUPPLIER=cj MEDUSA_BASE_URL=https://dbaronx-medusa-xrwh.onrender.com WEB_BASE_URL="${WEB_BASE_URL:?set current web storefront URL}" pnpm first-product:readiness',
      'node scripts/e2e-telegram-customer-first-checkout-journey-smoke.mjs',
      'node scripts/e2e-first-stripe-test-transaction-smoke.mjs',
      'node scripts/e2e-first-transaction-with-telegram-ops-smoke.mjs',
      'pnpm release:first-transaction:smokes',
    ],
    'H. Manual stop/go criteria before live customer checkout': {
      goOnlyWhen: [
        'Medusa launch-commerce returns success with no blockers.',
        'The full fresh publishable key has been copied into Medusa/API/Web/Bot environments that need it.',
        'The controlled CJ shirt is present, priced at 1999 minor units, in stock, has supplier metadata, and is accessible from Store API and web product URL.',
        'Telegram, FastAPI, and Web runtime readiness reports runtime_reachable and no blockers.',
        'Stripe controlled smoke creates a cs_test_* Checkout Session and signed webhook settlement proof is available after test payment.',
      ],
      stopIf: [
        'Any smoke reports blockers.',
        'Only build-only Fly image push has happened and actual Fly release status is unknown.',
        'Stripe session is cs_live_* during the controlled first transaction smoke.',
        'Medusa Store API products/regions are inaccessible with the fresh publishable key.',
        'Telegram or FastAPI runtime status is release_status_unknown, image_built_only, or runtime_unreachable.',
      ],
    },
  },
  nextManualStep:
    'Run pnpm first-transaction:commands whenever an operator needs the safe release pack; run actual deploy scripts, then pnpm runtime:fly:readiness and the first-transaction smokes before opening checkout.',
};

console.log(JSON.stringify(commandPack, null, 2));
