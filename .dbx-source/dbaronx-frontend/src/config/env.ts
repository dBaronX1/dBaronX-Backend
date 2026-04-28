export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://dbaronx.com",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://dbaronx.com",

  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  },

  api: {
    nestBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "",
    fastapiBaseUrl: process.env.NEXT_PUBLIC_FASTAPI_BASE_URL || process.env.NEXT_PUBLIC_FASTAPI_URL || "",
  },

  telegram: {
    botUsername: process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "dBaronX_bot",
    botLink: process.env.NEXT_PUBLIC_TELEGRAM_BOT_LINK || "https://t.me/dBaronX_DBX_Token",
  },

  payments: {
    paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_TEST_PUBLIC_KEY || "",
    stripePublicKeyTest: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY_TEST || "",
    stripePublicKeyLive: process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY_LIVE || "",
  },

  hcaptcha: {
    siteKey: process.env.NEXT_PUBLIC_HCAPTCHA_SECRET || "",
  },
} as const;

export default env;
