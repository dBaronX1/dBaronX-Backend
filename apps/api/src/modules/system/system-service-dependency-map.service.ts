import { Injectable } from "@nestjs/common";

@Injectable()
export class SystemServiceDependencyMapService {
  build() {
    return {
      success: true,
      serviceDependencyMap: {
        nestjs: {
          dependsOn: ["fastapi", "supabase", "medusa"],
          role: "economic_brain",
        },
        fastapi: {
          dependsOn: ["supabase"],
          role: "intelligence_brain",
        },
        medusa: {
          dependsOn: [],
          role: "commerce_only",
        },
        telegram: {
          dependsOn: ["nestjs", "fastapi"],
          role: "control_distribution_surface",
        },
        frontend: {
          dependsOn: ["nestjs", "medusa", "fastapi"],
          role: "revenue_surface",
        },
      },
    };
  }
}
