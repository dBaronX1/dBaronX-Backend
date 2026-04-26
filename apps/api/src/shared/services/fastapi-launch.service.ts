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

@Injectable()
export class FastapiLaunchService {
  constructor(
    private readonly fastapiHttp: FastapiIntelligenceHttpService,
  ) {}

  async getNestjsHandshake() {
    return this.fastapiHttp.get<FastapiHandshakeSummary>(
      "/nestjs-handshake/snapshot",
      {
        "x-caller-surface": "startup-handshake",
      },
    );
  }

  async getRuntimeSnapshot() {
    return this.fastapiHttp.get<FastapiRuntimeSnapshot>(
      "/runtime-snapshot/snapshot",
      {
        "x-caller-surface": "runtime-snapshot",
      },
    );
  }

  async getBootstrapRuntimeGuard() {
    return this.fastapiHttp.get<FastapiBootstrapRuntimeGuard>(
      "/bootstrap-runtime-guard/snapshot",
      {
        "x-caller-surface": "bootstrap-guard",
      },
    );
  }

  async getStep1Closure() {
    return this.fastapiHttp.get<FastapiStep1Closure>(
      "/fastapi-step1-closure/snapshot",
      {
        "x-caller-surface": "step1-closure",
      },
    );
  }

  async getLaunchControlManifest() {
    return this.fastapiHttp.get<FastapiLaunchControlManifest>(
      "/launch-control-manifest/snapshot",
      {
        "x-caller-surface": "launch-control",
      },
    );
  }

  async getFullLaunchReadinessBundle(): Promise<{
    handshake: FastapiEnvelope<FastapiHandshakeSummary>;
    runtime: FastapiEnvelope<FastapiRuntimeSnapshot>;
    bootstrapGuard: FastapiEnvelope<FastapiBootstrapRuntimeGuard>;
    step1Closure: FastapiEnvelope<FastapiStep1Closure>;
    launchControl: FastapiEnvelope<FastapiLaunchControlManifest>;
  }> {
    const [handshake, runtime, bootstrapGuard, step1Closure, launchControl] =
      await Promise.all([
        this.getNestjsHandshake(),
        this.getRuntimeSnapshot(),
        this.getBootstrapRuntimeGuard(),
        this.getStep1Closure(),
        this.getLaunchControlManifest(),
      ]);

    return {
      handshake,
      runtime,
      bootstrapGuard,
      step1Closure,
      launchControl,
    };
  }
}
