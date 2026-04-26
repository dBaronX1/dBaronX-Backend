import { Injectable } from "@nestjs/common";
import { CrossServiceCompatibilityService } from "./cross-service-compatibility.service";

@Injectable()
export class EconomicBrainReadinessService {
  constructor(
    private readonly crossServiceCompatibility: CrossServiceCompatibilityService,
  ) {}

  async build(requestId?: string) {
    const ecosystem = await this.crossServiceCompatibility.ecosystemSnapshot(
      requestId,
    );

    const fastapi = ecosystem.ecosystemCompatibility.services.fastapi;

    return {
      success: true,
      economicBrainReadiness: {
        ready: fastapi.compatible,
        status: fastapi.compatible ? "ready" : "degraded",
        blockers: fastapi.blockers,
        dependencies: ecosystem.ecosystemCompatibility.services,
      },
    };
  }
}
