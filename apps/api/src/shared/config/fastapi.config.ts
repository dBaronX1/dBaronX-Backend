import { registerAs } from "@nestjs/config";
import { EnvUtil } from "../utils/env.util";

export default registerAs("fastapi", () => ({
  baseUrl: EnvUtil.getUrl("FASTAPI_BASE_URL", ""),
  internalServiceToken: EnvUtil.getString("INTERNAL_SERVICE_TOKEN", ""),
  requestTimeoutMs: EnvUtil.getInteger("FASTAPI_TIMEOUT_MS", 20_000),
  retryAttempts: EnvUtil.getInteger("FASTAPI_RETRY_ATTEMPTS", 1),
  dbxVerifyPath: EnvUtil.getString(
    "FASTAPI_DBX_VERIFY_PATH",
    "/internal/dbx/verify-payment",
  ),
  fraudScorePath: EnvUtil.getString("FASTAPI_FRAUD_SCORE_PATH", "/fraud/score"),
  aiPath: EnvUtil.getString("FASTAPI_AI_PATH", "/ai"),
}));