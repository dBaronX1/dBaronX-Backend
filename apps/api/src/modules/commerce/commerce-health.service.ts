import { Injectable } from "@nestjs/common";
import { MedusaBridgeService } from "../../shared/services/medusa-bridge.service";
import { CrossServiceCompatibilityService } from "../../shared/services/cross-service-compatibility.service";

@Injectable()
export class CommerceHealthService {
  constructor(
    private readonly medusaBridge: MedusaBridgeService,
    private readonly crossServiceCompatibility: CrossServiceCompatibilityService,
  ) {}

  async snapshot(requestId?: string) {
    const [medusa, ecosystem] = await Promise.all([
      this.medusaBridge.health(requestId),
      this.crossServiceCompatibility.ecosystemSnapshot(requestId),
    ]);

    return {
      success: true,
      commerceHealth: {
        status:
          medusa.ready &&
          ecosystem.ecosystemCompatibility.services.fastapi.compatible
            ? "ready"
            : "degraded",
        medusa,
        ecosystemCompatibility: ecosystem.ecosystemCompatibility,
      },
    };
  }
}
