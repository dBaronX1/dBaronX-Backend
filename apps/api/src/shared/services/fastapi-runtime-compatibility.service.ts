import { Injectable } from "@nestjs/common";
import { FastapiIntelligenceConsumptionService } from "./fastapi-intelligence-consumption.service";
import { RuntimeBlockersService } from "./runtime-blockers.service";

@Injectable()
export class FastapiRuntimeCompatibilityService {
  constructor(
    private readonly fastapiConsumption: FastapiIntelligenceConsumptionService,
    private readonly runtimeBlockers: RuntimeBlockersService,
  ) {}

  async snapshot(requestId?: string) {
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

    return {
      success: true,
      status: blockers.length === 0 ? "ready" : "degraded",
      compatible: blockers.length === 0,
      blockers,
      handshake,
      runtime,
      step1Closure,
      launchControl,
    };
  }
}
