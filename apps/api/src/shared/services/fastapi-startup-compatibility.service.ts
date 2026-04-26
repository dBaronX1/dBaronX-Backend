import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { FastapiIntelligenceConsumptionService } from "./fastapi-intelligence-consumption.service";
import { RuntimeBlockersService } from "./runtime-blockers.service";
import { StartupAuditLogService } from "./startup-audit-log.service";

@Injectable()
export class FastapiStartupCompatibilityService {
  constructor(
    private readonly fastapiConsumption: FastapiIntelligenceConsumptionService,
    private readonly runtimeBlockers: RuntimeBlockersService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async verifyOrThrow(requestId?: string) {
    const bundle = await this.fastapiConsumption.readinessBundle(requestId);

    const handshake = bundle.handshake.nestjs_handshake!;
    const runtime = bundle.runtime.runtime_snapshot!;
    const step1Closure = bundle.step1Closure.fastapi_step1_closure!;
    const launchControl = bundle.launchControl.launch_control_manifest!;

    const blockers = this.runtimeBlockers.collectFastapiBlockers({
      handshake,
      runtime,
      step1Closure,
      launchControl,
    });

    this.startupAudit.record({
      source: "fastapi-startup-compatibility",
      status: blockers.length === 0 ? "pass" : "fail",
      message:
        blockers.length === 0
          ? "FastAPI startup compatibility verified"
          : "FastAPI startup compatibility failed",
      details: {
        blockers,
        launchBand: launchControl.launch_band,
        launchScore: launchControl.launch_score,
        runtimeStatus: runtime.status,
      },
    });

    if (blockers.length > 0) {
      throw new ServiceUnavailableException({
        success: false,
        message: "FastAPI startup compatibility failed",
        blockers,
        runtime,
        launchControl,
      });
    }

    return {
      success: true,
      compatible: true,
      handshake,
      runtime,
      step1Closure,
      launchControl,
    };
  }
}
