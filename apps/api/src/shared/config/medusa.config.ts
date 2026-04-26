import { registerAs } from "@nestjs/config";
import { EnvUtil } from "../utils/env.util";

export default registerAs("medusa", () => ({
  baseUrl: EnvUtil.getUrl("MEDUSA_BASE_URL", ""),
  publishableKey: EnvUtil.getString("MEDUSA_PUBLISHABLE_KEY", ""),
  adminApiKey: EnvUtil.getString("MEDUSA_ADMIN_API_KEY", ""),
  requestTimeoutMs: EnvUtil.getInteger("MEDUSA_TIMEOUT_MS", 20_000),
  retryAttempts: EnvUtil.getInteger("MEDUSA_RETRY_ATTEMPTS", 1),
  storeRegionId: EnvUtil.getString("MEDUSA_DEFAULT_REGION_ID", ""),
  orderSyncEnabled: EnvUtil.getBoolean("MEDUSA_ORDER_SYNC_ENABLED", true),
}));