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

  async handshake(requestId?: string): Promise<FastapiEnvelope<FastapiHandshakeSummary>> {
    return this.fastapiHttp.get<FastapiHandshakeSummary>(
      "/nestjs-handshake/snapshot",
      this.headers.forStartup(requestId),
    );
  }

  async runtimeSnapshot(
    requestId?: string,
  ): Promise<FastapiEnvelope<FastapiRuntimeSnapshot>> {
    return this.fastapiHttp.get<FastapiRuntimeSnapshot>(
      "/runtime-snapshot/snapshot",
      this.headers.forRuntimeProbe(requestId),
    );
  }

  async bootstrapGuard(
    requestId?: string,
  ): Promise<FastapiEnvelope<FastapiBootstrapRuntimeGuard>> {
    return this.fastapiHttp.get<FastapiBootstrapRuntimeGuard>(
      "/bootstrap-runtime-guard/snapshot",
      this.headers.forStartup(requestId),
    );
  }

  async step1Closure(
    requestId?: string,
  ): Promise<FastapiEnvelope<FastapiStep1Closure>> {
    return this.fastapiHttp.get<FastapiStep1Closure>(
      "/fastapi-step1-closure/snapshot",
      this.headers.forStartup(requestId),
    );
  }

  async launchControl(
    requestId?: string,
  ): Promise<FastapiEnvelope<FastapiLaunchControlManifest>> {
    return this.fastapiHttp.get<FastapiLaunchControlManifest>(
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
