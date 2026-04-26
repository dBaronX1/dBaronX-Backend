import * as Joi from "joi";

export const EnvSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "test", "staging", "production")
    .required(),

  PORT: Joi.number().port().default(3000),
  APP_NAME: Joi.string().default("dBaronX API"),
  APP_URL: Joi.string().uri().required(),
  FRONTEND_URL: Joi.string().uri().required(),
  API_PREFIX: Joi.string().default("api"),
  SWAGGER_ENABLED: Joi.boolean().truthy("true").falsy("false").default(false),
  CORS_ORIGINS: Joi.string().allow("").optional(),
  TELEGRAM_BOT_URL: Joi.string().uri().allow("").optional(),

  SUPABASE_URL: Joi.string().uri().required(),
  SUPABASE_SERVICE_ROLE_KEY: Joi.string().required(),
  SUPABASE_ANON_KEY: Joi.string().allow("").optional(),

  MEDUSA_BASE_URL: Joi.string().uri().required(),
  MEDUSA_PUBLISHABLE_KEY: Joi.string().allow("").optional(),
  MEDUSA_ADMIN_API_KEY: Joi.string().allow("").optional(),

  FASTAPI_BASE_URL: Joi.string().uri().required(),
  INTERNAL_SERVICE_TOKEN: Joi.string().min(20).required(),

  REDIS_URL: Joi.string().allow("").optional(),

  JWT_SECRET: Joi.string().allow("").optional(),
  JWT_EXPIRES: Joi.string().allow("").optional(),

  STRIPE_SECRET_KEY: Joi.string().allow("").optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow("").optional(),
  PAYSTACK_SECRET: Joi.string().allow("").optional(),
  FLUTTERWAVE_SECRET: Joi.string().allow("").optional(),
  BINANCE_PAY_API_KEY: Joi.string().allow("").optional(),
  BINANCE_PAY_SECRET: Joi.string().allow("").optional(),
  COINBASE_API_KEY: Joi.string().allow("").optional(),

  EMAIL_API_KEY: Joi.string().allow("").optional(),
  EMAIL_SENDER: Joi.string().allow("").optional(),

  AWS_ACCESS_KEY: Joi.string().allow("").optional(),
  AWS_SECRET_KEY: Joi.string().allow("").optional(),
  AWS_REGION: Joi.string().allow("").optional(),
  AWS_BUCKET: Joi.string().allow("").optional(),

  FILES_DIR: Joi.string().allow("").optional(),

  MAINTENANCE_MODE: Joi.boolean().truthy("true").falsy("false").default(false),
  BLOCKED_IPS: Joi.string().allow("").optional(),
});
