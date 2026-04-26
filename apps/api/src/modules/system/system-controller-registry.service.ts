import { Injectable } from "@nestjs/common";

@Injectable()
export class SystemControllerRegistryService {
  build() {
    return {
      success: true,
      controllerRegistry: {
        commerce: [
          "commerce/sync-contract",
          "commerce/boundary-proof",
          "commerce/reconciliation-proof",
          "commerce/final-closure",
          "commerce/final-closure-readiness",
        ],
        system: [
          "system/startup-gate",
          "system/runtime-contract",
          "system/deployment-readiness",
          "system/final-launch-closure",
          "system/final-release-pack",
          "system/final-integration-verification",
          "system/canonical-completion",
          "system/finalization-readiness",
        ],
        note:
          "Registry exists to verify that newly introduced finalization controllers are mounted and reachable through the canonical shell.",
      },
    };
  }
}
