import { Injectable } from "@nestjs/common";
import { SystemAdminEndpointRegistryService } from "./system-admin-endpoint-registry.service";
import { SystemModuleClosureService } from "./system-module-closure.service";
import { SystemOrchestrationIndexService } from "./system-orchestration-index.service";

@Injectable()
export class SystemShellManifestService {
  constructor(
    private readonly moduleClosure: SystemModuleClosureService,
    private readonly orchestrationIndex: SystemOrchestrationIndexService,
    private readonly adminEndpointRegistry: SystemAdminEndpointRegistryService,
  ) {}

  build() {
    return {
      success: true,
      shellManifest: {
        shell: "nestjs-canonical-shell",
        moduleClosure: this.moduleClosure.build().moduleClosure,
        orchestrationIndex: this.orchestrationIndex.build().orchestrationIndex,
        adminEndpointRegistry:
          this.adminEndpointRegistry.build().adminEndpointRegistry,
      },
    };
  }
}
