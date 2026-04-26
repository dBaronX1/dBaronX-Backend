import { Injectable } from "@nestjs/common";
import { EconomicBrainReadinessService } from "../../shared/services/economic-brain-readiness.service";
import { FastapiRuntimeCompatibilityService } from "../../shared/services/fastapi-runtime-compatibility.service";

@Injectable()
export class SystemLaunchReadinessService {
  constructor(
    private readonly economicBrainReadiness: EconomicBrainReadinessService,
    private readonly fastapiRuntimeCompatibility: FastapiRuntimeCompatibilityService,
  ) {}

  async snapshot(requestId?: string) {
    const [economicBrain, fastapi] = await Promise.all([
      this.economicBrainReadiness.build(requestId),
      this.fastapiRuntimeCompatibility.snapshot(requestId),
    ]);

    return {
      success: true,
      launchReadiness: {
        status:
          economicBrain.economicBrainReadiness.ready && fastapi.compatible
            ? "ready"
            : "degraded",
        economicBrain: economicBrain.economicBrainReadiness,
        fastapi,
      },
    };
  }
}
