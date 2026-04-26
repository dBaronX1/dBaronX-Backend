import { Injectable } from "@nestjs/common";
import { SystemLaunchClosureService } from "../../modules/system/system-launch-closure.service";
import { SystemShellClosureService } from "../../modules/system/system-shell-closure.service";

@Injectable()
export class SystemFinalLaunchClosureService {
  constructor(
    private readonly launchClosure: SystemLaunchClosureService,
    private readonly shellClosure: SystemShellClosureService,
  ) {}

  async build(requestId?: string) {
    const launch = await this.launchClosure.build(requestId);
    const shell = await this.shellClosure.build(requestId);

    const closed =
      launch.launchClosure.ready === true && shell.shellClosure.closed === true;

    return {
      success: true,
      finalLaunchClosure: {
        closed,
        launchClosure: launch.launchClosure,
        shellClosure: shell.shellClosure,
      },
    };
  }
}
