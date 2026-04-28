export default () => ({
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  },

  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  },

  payments: {
    stripeSecret: process.env.STRIPE_SECRET_KEY,
    stripeWebhook: process.env.STRIPE_WEBHOOK_SECRET,
    paystackSecret: process.env.PAYSTACK_SECRET_KEY,
    paystackWebhook: process.env.PAYSTACK_WEBHOOK_SECRET,
  },

  medusa: {
    baseUrl: process.env.MEDUSA_BASE_URL,
    apiKey: process.env.MEDUSA_API_KEY,
  },
});