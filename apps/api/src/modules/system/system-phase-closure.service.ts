import { Injectable } from "@nestjs/common";
import { SystemLaunchClosureService } from "./system-launch-closure.service";
import { SystemModuleClosureService } from "./system-module-closure.service";
import { SystemShellClosureService } from "./system-shell-closure.service";

@Injectable()
export class SystemPhaseClosureService {
  constructor(
    private readonly moduleClosure: SystemModuleClosureService,
    private readonly shellClosure: SystemShellClosureService,
    private readonly launchClosure: SystemLaunchClosureService,
  ) {}

  async build(requestId?: string) {
    const [moduleClosure, shellClosure, launchClosure] = await Promise.all([
      Promise.resolve(this.moduleClosure.build()),
      this.shellClosure.build(requestId),
      this.launchClosure.build(requestId),
    ]);

    const nestjsCurrentPhaseClosed =
      moduleClosure.moduleClosure.modules.system === "closed_for_current_phase" &&
      shellClosure.shellClosure.closed === launchClosure.launchClosure.ready;

    return {
      success: true,
      phaseClosure: {
        subsystem: "nestjs",
        currentPhaseClosed: nestjsCurrentPhaseClosed,
        moduleClosure: moduleClosure.moduleClosure,
        shellClosure: shellClosure.shellClosure,
        launchClosure: launchClosure.launchClosure,
        nextSubsystem: "fastapi_final_enforcement",
      },
    };
  }
}
