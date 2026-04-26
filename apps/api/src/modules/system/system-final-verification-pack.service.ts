import { Injectable } from "@nestjs/common";
import { SystemAppShellWiringService } from "./system-app-shell-wiring.service";
import { SystemCanonicalCompletionService } from "./system-canonical-completion.service";
import { SystemControllerRegistryService } from "./system-controller-registry.service";
import { SystemFinalizationReadinessService } from "./system-finalization-readiness.service";

@Injectable()
export class SystemFinalVerificationPackService {
  constructor(
    private readonly appShellWiring: SystemAppShellWiringService,
    private readonly controllerRegistry: SystemControllerRegistryService,
    private readonly canonicalCompletion: SystemCanonicalCompletionService,
    private readonly finalizationReadiness: SystemFinalizationReadinessService,
  ) {}

  async build(requestId?: string) {
    const shell = this.appShellWiring.build().appShellWiring;
    const registry = this.controllerRegistry.build().controllerRegistry;
    const canonical = await this.canonicalCompletion.build(requestId);
    const readiness = await this.finalizationReadiness.build(requestId);

    const checks = {
      appShellWiringPresent: Boolean(shell),
      controllerRegistryPresent: Boolean(registry),
      canonicalCompletionPresent: Boolean(canonical.canonicalCompletion),
      finalizationReadinessPresent: Boolean(readiness.finalizationReadiness),
      canonicalCompletionClosed: canonical.canonicalCompletion.closed === true,
      finalizationReadinessClosed: readiness.finalizationReadiness.closed === true,
    };

    const blockers = Object.entries(checks)
      .filter(([, value]) => value !== true)
      .map(([key]) => key);

    return {
      success: true,
      finalVerificationPack: {
        closed: blockers.length === 0,
        checks,
        blockers,
        appShellWiring: shell,
        controllerRegistry: registry,
        canonicalCompletion: canonical.canonicalCompletion,
        finalizationReadiness: readiness.finalizationReadiness,
      },
    };
  }
}
