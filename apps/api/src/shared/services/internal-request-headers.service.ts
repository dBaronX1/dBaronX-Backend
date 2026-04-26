import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { FastapiIdentityHeaders } from "../contracts/fastapi-intelligence.contract";

export interface BuildInternalHeaderOptions {
  requestId?: string;
  callerService?: string;
  callerSurface?: string;
  actorId?: string;
}

@Injectable()
export class InternalRequestHeadersService {
  build(
    options?: BuildInternalHeaderOptions,
  ): Partial<FastapiIdentityHeaders> {
    return {
      "x-request-id": options?.requestId || randomUUID(),
      "x-caller-service": options?.callerService || "dbaronx-api",
      "x-caller-surface": options?.callerSurface || "nestjs",
      "x-actor-id": options?.actorId,
    };
  }

  forStartup(requestId?: string): Partial<FastapiIdentityHeaders> {
    return this.build({
      requestId,
      callerSurface: "startup",
    });
  }

  forRuntimeProbe(requestId?: string): Partial<FastapiIdentityHeaders> {
    return this.build({
      requestId,
      callerSurface: "runtime-probe",
    });
  }

  forAdmin(actorId?: string, requestId?: string): Partial<FastapiIdentityHeaders> {
    return this.build({
      actorId,
      requestId,
      callerSurface: "admin-ops",
    });
  }

  forEconomicBrain(requestId?: string): Partial<FastapiIdentityHeaders> {
    return this.build({
      requestId,
      callerSurface: "economic-brain",
    });
  }
}
