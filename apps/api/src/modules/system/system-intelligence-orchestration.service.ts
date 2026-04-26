import { Injectable } from "@nestjs/common";
import { FastapiIntelligenceConsumptionService } from "../../shared/services/fastapi-intelligence-consumption.service";
import { IntelligenceDecisionFacadeService } from "../../shared/services/intelligence-decision-facade.service";

@Injectable()
export class SystemIntelligenceOrchestrationService {
  constructor(
    private readonly fastapiConsumption: FastapiIntelligenceConsumptionService,
    private readonly decisionFacade: IntelligenceDecisionFacadeService,
  ) {}

  async capabilitySnapshot(requestId?: string) {
    const [handshake, runtime, bootstrapGuard, step1Closure, launchControl] =
      await Promise.all([
        this.fastapiConsumption.handshake(requestId),
        this.fastapiConsumption.runtimeSnapshot(requestId),
        this.fastapiConsumption.bootstrapGuard(requestId),
        this.fastapiConsumption.step1Closure(requestId),
        this.fastapiConsumption.launchControl(requestId),
      ]);

    return {
      success: true,
      intelligenceOrchestration: {
        handshake: handshake.nestjs_handshake,
        runtime: runtime.runtime_snapshot,
        bootstrapGuard: bootstrapGuard.bootstrap_runtime_guard,
        step1Closure: step1Closure.fastapi_step1_closure,
        launchControl: launchControl.launch_control_manifest,
        surfaces: {
          watch: true,
          affiliate: true,
          payments: true,
          aiStories: true,
        },
      },
    };
  }

  getDecisionFacade(): IntelligenceDecisionFacadeService {
    return this.decisionFacade;
  }
}
