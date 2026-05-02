import { Injectable, Logger } from "@nestjs/common";
import { FastapiIntelligenceConsumptionService } from "./fastapi-intelligence-consumption.service";
import { RuntimeBlockersService } from "./runtime-blockers.service";

@Injectable()
export class FastapiRuntimeCompatibilityService {
  private readonly logger = new Logger(FastapiRuntimeCompatibilityService.name);

  constructor(
    private readonly fastapiConsumption: FastapiIntelligenceConsumptionService,
    private readonly runtimeBlockers: RuntimeBlockersService,
  ) {}

  async snapshot(requestId?: string) {
    let bundle: Awaited<
      ReturnType<FastapiIntelligenceConsumptionService["readinessBundle"]>
    >;

    try {
      bundle = await this.fastapiConsumption.readinessBundle(requestId);
    } catch (error: unknown) {
      const checkedAt = new Date().toISOString();
      const message = error instanceof Error ? error.message : String(error);

      this.logger.warn(
        JSON.stringify({
          event: "fastapi_runtime_snapshot_degraded",
          dependency: "fastapi",
          status: "degraded",
          message,
          timestamp: checkedAt,
        }),
      );

      return {
        success: true,
        status: "degraded",
        compatible: false,
        blockers: ["fastapi_readiness_bundle_unavailable"],
        dependency: {
          name: "fastapi",
          status: "degraded",
          message,
          timestamp: checkedAt,
        },
        handshake: null,
        runtime: null,
        step1Closure: null,
        launchControl: null,
      };
    }

    const handshake = ensureObject(
      bundle.handshake.nestjs_handshake,
      "handshake",
    );
    const runtime = ensureObject(
      bundle.runtime.runtime_snapshot,
      "runtime_snapshot",
    );
    const step1Closure = ensureObject(
      bundle.step1Closure.fastapi_step1_closure,
      "fastapi_step1_closure",
    );
    const launchControl = ensureObject(
      bundle.launchControl.launch_control_manifest,
      "launch_control_manifest",
    );

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
      dependency: {
        name: "fastapi",
        status: blockers.length === 0 ? "ready" : "degraded",
        message:
          blockers.length === 0
            ? "FastAPI readiness bundle available"
            : "FastAPI readiness bundle indicates compatibility blockers",
        timestamp: new Date().toISOString(),
      },
      handshake,
      runtime,
      step1Closure,
      launchControl,
    };
  }
}

function ensureObject<T>(value: T | boolean | undefined, field: string): T {
  if (value && typeof value === "object") {
    return value as T;
  }

  throw new Error(`Missing or invalid FastAPI payload field: ${field}`);
}
