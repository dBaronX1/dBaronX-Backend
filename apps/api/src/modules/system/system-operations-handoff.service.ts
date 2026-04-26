import { Injectable } from "@nestjs/common";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemModuleClosureService } from "./system-module-closure.service";
import { SystemOrchestrationIndexService } from "./system-orchestration-index.service";
import { SystemServiceDependencyMapService } from "./system-service-dependency-map.service";

@Injectable()
export class SystemOperationsHandoffService {
  constructor(
    private readonly systemLaunchClosure: SystemLaunchClosureService,
    private readonly systemModuleClosure: SystemModuleClosureService,
    private readonly systemOrchestrationIndex: SystemOrchestrationIndexService,
    private readonly systemServiceDependencyMap: SystemServiceDependencyMapService,
  ) {}

  async build(requestId?: string) {
    const [launchClosure, moduleClosure] = await Promise.all([
      this.systemLaunchClosure.build(requestId),
      Promise.resolve(this.systemModuleClosure.build()),
    ]);

    return {
      success: true,
      operationsHandoff: {
        launchClosure: launchClosure.launchClosure,
        moduleClosure: moduleClosure.moduleClosure,
        orchestrationIndex: this.systemOrchestrationIndex.build().orchestrationIndex,
        serviceDependencyMap: this.systemServiceDependencyMap.build().serviceDependencyMap,
        nextSubsystems: [
          "fastapi_final_enforcement",
          "telegram_production_surface",
          "frontend_launch_surfaces",
          "final_medusa_closure",
        ],
      },
    };
  }
}
