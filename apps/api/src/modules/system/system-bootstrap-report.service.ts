import { Injectable } from "@nestjs/common";
import { AppBootstrapService } from "../../shared/bootstrap/app-bootstrap.service";
import { SystemBootstrapHardeningService } from "./system-bootstrap-hardening.service";
import { SystemStartupSequenceService } from "../../shared/services/system-startup-sequence.service";

@Injectable()
export class SystemBootstrapReportService {
  constructor(
    private readonly appBootstrap: AppBootstrapService,
    private readonly systemStartupSequence: SystemStartupSequenceService,
    private readonly systemBootstrapHardening: SystemBootstrapHardeningService,
  ) {}

  async build(requestId?: string) {
    const [bootstrap, startupSequence, bootstrapHardening] =
      await Promise.all([
        this.appBootstrap.run(requestId),
        this.systemStartupSequence.build(requestId),
        this.systemBootstrapHardening.build(requestId),
      ]);

    return {
      success: true,
      bootstrapReport: {
        bootstrap: bootstrap.bootstrap,
        startupSequence: startupSequence.startupSequence,
        bootstrapHardening: bootstrapHardening.bootstrapHardening,
      },
    };
  }
}
