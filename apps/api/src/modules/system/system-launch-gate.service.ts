import { Injectable } from "@nestjs/common";
import { LaunchGateService } from "../../shared/services/launch-gate.service";

@Injectable()
export class SystemLaunchGateService {
  constructor(private readonly launchGate: LaunchGateService) {}

  snapshot() {
    return this.launchGate.snapshot();
  }
}
