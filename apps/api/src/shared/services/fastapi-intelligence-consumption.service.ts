import { Injectable } from "@nestjs/common";
import {
  FastapiBootstrapRuntimeGuard,
  FastapiEnvelope,
  FastapiHandshakeSummary,
  FastapiLaunchControlManifest,
  FastapiRuntimeSnapshot,
  FastapiStep1Closure,
} from "../contracts/fastapi-intelligence.contract";
import { FastapiIntelligenceHttpService } from "./fastapi-intelligence-http.service";
import { InternalRequestHeadersService } from "./internal-request-headers.service";

@Injectable()
export class FastapiIntelligenceConsumptionService {
  constructor(
    private readonly fastapiHttp: FastapiIntelligenceHttpService,
    private readonly headers: InternalRequestHeadersService,
  ) {}

  async handshake(requestId?: string): Promise<FastapiEnvelope<{ nestjs_handshake: FastapiHandshakeSummary }>> {
    return this.fastapiHttp.get<{ nestjs_handshake: FastapiHandshakeSummary }>(
      "/nestjs-handshake/snapshot",
      this.headers.forStartup(requestId),
    );
  }

  async runtimeSnapshot(
    requestId?: string,
  ): Promise<FastapiEnvelope<{ runtime_snapshot: FastapiRuntimeSnapshot }>> {
    return this.fastapiHttp.get<{ runtime_snapshot: FastapiRuntimeSnapshot }>(
      "/runtime-snapshot/snapshot",
      this.headers.forRuntimeProbe(requestId),
    );
  }

  async bootstrapGuard(
    requestId?: string,
  ): Promise<FastapiEnvelope<{ bootstrap_runtime_guard: FastapiBootstrapRuntimeGuard }>> {
    return this.fastapiHttp.get<{ bootstrap_runtime_guard: FastapiBootstrapRuntimeGuard }>(
      "/intelligence-startup-gate/snapshot",
      this.headers.forStartup(requestId),
    );
  }

  async step1Closure(
    requestId?: string,
  ): Promise<FastapiEnvelope<{ fastapi_step1_closure: FastapiStep1Closure }>> {
    return this.fastapiHttp.get<{ fastapi_step1_closure: FastapiStep1Closure }>(
      "/fastapi-step1-closure/snapshot",
      this.headers.forStartup(requestId),
    );
  }

  async launchControl(
    requestId?: string,
  ): Promise<FastapiEnvelope<{ launch_control_manifest: FastapiLaunchControlManifest }>> {
    return this.fastapiHttp.get<{ launch_control_manifest: FastapiLaunchControlManifest }>(
      "/launch-control-manifest/snapshot",
      this.headers.forEconomicBrain(requestId),
    );
  }

  async readinessBundle(requestId?: string) {
    const [handshake, runtime, bootstrapGuard, step1Closure, launchControl] =
      await Promise.all([
        this.handshake(requestId),
        this.runtimeSnapshot(requestId),
        this.bootstrapGuard(requestId),
        this.step1Closure(requestId),
        this.launchControl(requestId),
      ]);

    return {
      success: true,
      handshake,
      runtime,
      bootstrapGuard,
      step1Closure,
      launchControl,
    };
  }
}
