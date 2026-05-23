import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";

import { Public } from "./shared/decorators/public.decorator";

type HealthPayload = {
  service: "dbaronx-api";
  status: "ok";
  version: string;
  timestamp: string;
  internalAuthDiagnosticsBuild: "custom_exception_v2";
  commit: string;
};

interface HealthResponse {
  success: true;
  statusCode: 200;
  message: "OK";
  data: HealthPayload;
}

@Controller({ version: VERSION_NEUTRAL })
export class HealthController {
  @Public()
  @Get("health")
  health(): HealthResponse {
    return this.makeHealthResponse();
  }

  @Public()
  @Get("api/health")
  apiHealth(): HealthResponse {
    return this.makeHealthResponse();
  }

  private makeHealthResponse(): HealthResponse {
    const version = process.env.npm_package_version || "1.0.0";
    const commit = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || "unknown";

    return {
      success: true,
      statusCode: 200,
      message: "OK",
      data: {
        service: "dbaronx-api",
        status: "ok",
        version,
        timestamp: new Date().toISOString(),
        internalAuthDiagnosticsBuild: "custom_exception_v2",
        commit,
      },
    };
  }
}
