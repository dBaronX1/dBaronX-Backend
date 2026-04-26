import { registerAs } from "@nestjs/config";
import { EnvUtil } from "../utils/env.util";

export default registerAs("app", () => ({
  name: EnvUtil.getString("APP_NAME", "dBaronX API"),
  nodeEnv: EnvUtil.getString("NODE_ENV", "development"),
  port: EnvUtil.getNumber("PORT", 3000),
  apiPrefix: EnvUtil.getString("API_PREFIX", "api"),
  swaggerEnabled: EnvUtil.getBoolean("SWAGGER_ENABLED", false),
  corsOrigins: EnvUtil.getString("CORS_ORIGINS", ""),
  appUrl: EnvUtil.getString("APP_URL", ""),
  frontendUrl: EnvUtil.getString("FRONTEND_URL", ""),
  telegramBotUrl: EnvUtil.getString("TELEGRAM_BOT_URL", ""),
}));
