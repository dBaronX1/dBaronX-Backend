import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { EconomicBrainReadinessService } from "./economic-brain-readiness.service";
import { FastapiStartupCompatibilityService } from "./fastapi-startup-compatibility.service";
import { ServiceRuntimeRegistryService } from "./service-runtime-registry.service";
import { StartupAuditLogService } from "./startup-audit-log.service";

@Injectable()
export class SystemBootstrapOrchestratorService
  implements OnApplicationBootstrap
{
  private readonly logger = new Logger(SystemBootstrapOrchestratorService.name);

  constructor(
    private readonly fastapiStartupCompatibility: FastapiStartupCompatibilityService,
    private readonly economicBrainReadiness: EconomicBrainReadinessService,
    private readonly runtimeRegistry: ServiceRuntimeRegistryService,
    private readonly startupAudit: StartupAuditLogService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const requestId = randomUUID();

    try {
      const fastapi = await this.fastapiStartupCompatibility.verifyOrThrow(
        requestId,
      );

      this.runtimeRegistry.set({
        name: "fastapi",
        status: "ready",
        compatible: true,
        blockers: [],
        details: {
          launchBand: fastapi.launchControl.launch_band,
          launchScore: fastapi.launchControl.launch_score,
          runtimeStatus: fastapi.runtime.status,
        },
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      const blockers = Array.isArray(error?.response?.blockers)
        ? error.response.blockers
        : ["fastapi_startup_verification_failed"];

      this.runtimeRegistry.set({
        name: "fastapi",
        status: "degraded",
        compatible: false,
        blockers,
        details: {
          error: error?.message || "Unknown startup compatibility error",
        },
        checkedAt: new Date().toISOString(),
      });

      this.startupAudit.record({
        source: "system-bootstrap-orchestrator",
        status: "fail",
        message: "FastAPI compatibility failed during NestJS bootstrap",
        details: {
          blockers,
        },
      });

      this.logger.error(
        `FastAPI compatibility failed during bootstrap: ${JSON.stringify(
          blockers,
        )}`,
      );
    }

    const brain = await this.economicBrainReadiness.build(requestId);

    this.runtimeRegistry.set({
      name: "economic-brain",
      status: brain.economicBrainReadiness.ready ? "ready" : "degraded",
      compatible: brain.economicBrainReadiness.ready,
      blockers: brain.economicBrainReadiness.blockers,
      details: {
        dependencies: brain.economicBrainReadiness.dependencies,
      },
      checkedAt: new Date().toISOString(),
    });

    this.startupAudit.record({
      source: "system-bootstrap-orchestrator",
      status: brain.economicBrainReadiness.ready ? "pass" : "warn",
      message: brain.economicBrainReadiness.ready
        ? "Economic brain readiness established"
        : "Economic brain readiness degraded",
      details: {
        blockers: brain.economicBrainReadiness.blockers,
      },
    });
  }
}
