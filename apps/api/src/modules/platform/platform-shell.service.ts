import { Injectable } from "@nestjs/common";
import { SystemOrchestrationIndexService } from "../system/system-orchestration-index.service";
import { SystemLaunchClosureService } from "../system/system-launch-closure.service";

@Injectable()
export class PlatformShellService {
  constructor(
    private readonly orchestrationIndex: SystemOrchestrationIndexService,
    private readonly systemLaunchClosure: SystemLaunchClosureService,
  ) {}

  async snapshot(requestId?: string) {
    const [index, launchClosure] = await Promise.all([
      Promise.resolve(this.orchestrationIndex.build()),
      this.systemLaunchClosure.build(requestId),
    ]);

    return {
      success: true,
      platformShell: {
        ready: launchClosure.launchClosure.ready,
        blockers: launchClosure.launchClosure.blockers,
        orchestrationIndex: index.orchestrationIndex,
      },
    };
  }
}
