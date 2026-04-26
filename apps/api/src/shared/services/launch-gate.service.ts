import {
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ServiceRuntimeRegistryService } from "./service-runtime-registry.service";

@Injectable()
export class LaunchGateService {
  constructor(
    private readonly runtimeRegistry: ServiceRuntimeRegistryService,
  ) {}

  snapshot() {
    const services = this.runtimeRegistry.getAll();
    const summary = this.runtimeRegistry.summary();

    const blockers = services.flatMap((item) =>
      item.blockers.map((blocker) => `${item.name}:${blocker}`),
    );

    return {
      success: true,
      launchGate: {
        ready:
          services.length > 0 &&
          services.every((item) => item.compatible && item.status === "ready"),
        summary,
        services,
        blockers,
      },
    };
  }

  assertReady(): void {
    const snapshot = this.snapshot();

    if (!snapshot.launchGate.ready) {
      throw new ServiceUnavailableException({
        success: false,
        message: "Launch gate not satisfied",
        blockers: snapshot.launchGate.blockers,
        services: snapshot.launchGate.services,
      });
    }
  }
}
