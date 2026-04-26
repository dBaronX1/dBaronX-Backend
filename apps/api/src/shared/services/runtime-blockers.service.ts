import { Injectable } from "@nestjs/common";
import {
  FastapiHandshakeSummary,
  FastapiLaunchControlManifest,
  FastapiRuntimeSnapshot,
  FastapiStep1Closure,
} from "../contracts/fastapi-intelligence.contract";

@Injectable()
export class RuntimeBlockersService {
  collectFastapiBlockers(input: {
    handshake: FastapiHandshakeSummary;
    runtime: FastapiRuntimeSnapshot;
    step1Closure: FastapiStep1Closure;
    launchControl: FastapiLaunchControlManifest;
  }): string[] {
    const blockers = new Set<string>();

    if (!input.handshake.compatible) {
      blockers.add("fastapi_handshake_incompatible");
    }

    if (input.runtime.status !== "ready") {
      blockers.add("fastapi_runtime_not_ready");
    }

    for (const blocker of input.runtime.blockers || []) {
      blockers.add(`fastapi_runtime:${blocker}`);
    }

    if (!input.step1Closure.closed) {
      blockers.add("fastapi_step1_not_closed");
    }

    for (const blocker of input.step1Closure.blockers || []) {
      blockers.add(`fastapi_step1:${blocker}`);
    }

    if (!input.launchControl.go_live_allowed) {
      blockers.add("fastapi_launch_control_denied");
    }

    for (const blocker of input.launchControl.blockers || []) {
      blockers.add(`fastapi_launch:${blocker}`);
    }

    return [...blockers];
  }
}
