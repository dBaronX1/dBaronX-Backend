import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";

import { Public } from "./shared/decorators/public.decorator";

interface HealthResponse {
  success: true;
  service: "dbaronx-api";
  status: "ok";
  timestamp: string;
  version?: string;
  internalAuthDiagnosticsBuild: "custom_exception_v2";
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
    const version = process.env.npm_package_version;

    return {
      success: true,
      service: "dbaronx-api",
      status: "ok",
      timestamp: new Date().toISOString(),
      internalAuthDiagnosticsBuild: "custom_exception_v2",
      ...(version ? { version } : {}),
    };
  }
}
