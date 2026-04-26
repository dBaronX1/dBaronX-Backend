import { Injectable } from "@nestjs/common";

@Injectable()
export class SystemRuntimeContractService {
  build() {
    return {
      success: true,
      runtimeContract: {
        services: {
          nestjs: {
            required: true,
            purpose: "economic_brain_and_api_gateway",
          },
          fastapi: {
            required: true,
            purpose: "intelligence_risk_and_ai_brain",
          },
          medusa: {
            required: true,
            purpose: "commerce_only_storage_and_fulfillment_plugin",
          },
          frontend: {
            required: true,
            purpose: "mobile_first_revenue_surface",
          },
          telegram: {
            required: false,
            purpose: "control_and_distribution_surface",
          },
        },
        rules: [
          "Frontend depends on NestJS contracts for business-state visibility",
          "FastAPI outputs must be consumed through guarded backend contracts",
          "Medusa must not be treated as economic authority",
          "Runtime sequencing must respect backend availability before frontend launch claims",
        ],
      },
    };
  }
}
