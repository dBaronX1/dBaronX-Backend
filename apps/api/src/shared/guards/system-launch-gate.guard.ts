import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { LaunchGateService } from "../services/launch-gate.service";

@Injectable()
export class SystemLaunchGateGuard implements CanActivate {
  constructor(private readonly launchGate: LaunchGateService) {}

  canActivate(_context: ExecutionContext): boolean {
    const snapshot = this.launchGate.snapshot().launchGate;

    if (!snapshot.ready) {
      throw new ServiceUnavailableException({
        success: false,
        message: "System launch gate is not satisfied",
        blockers: snapshot.blockers,
        services: snapshot.services,
      });
    }

    return true;
  }
}
