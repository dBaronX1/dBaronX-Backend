import { Injectable } from "@nestjs/common";
import { FastapiRuntimeCompatibilityService } from "./fastapi-runtime-compatibility.service";

@Injectable()
export class CrossServiceCompatibilityService {
  constructor(
    private readonly fastapiRuntimeCompatibility: FastapiRuntimeCompatibilityService,
  ) {}

  async ecosystemSnapshot(requestId?: string) {
    const fastapi = await this.fastapiRuntimeCompatibility.snapshot(requestId);

    return {
      success: true,
      ecosystemCompatibility: {
        status: fastapi.compatible ? "ready" : "degraded",
        services: {
          fastapi: {
            compatible: fastapi.compatible,
            status: fastapi.status,
            blockers: fastapi.blockers,
          },
          nestjs: {
            compatible: true,
            status: "running",
            blockers: [],
          },
        },
      },
    };
  }
}
