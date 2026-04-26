import { Injectable } from "@nestjs/common";
import { PlatformShellService } from "./platform-shell.service";
import { SystemAdminSummaryService } from "../system/system-admin-summary.service";
import { SystemAdminEndpointRegistryService } from "../system/system-admin-endpoint-registry.service";

@Injectable()
export class PlatformAdminPackService {
  constructor(
    private readonly platformShell: PlatformShellService,
    private readonly systemAdminSummary: SystemAdminSummaryService,
    private readonly endpointRegistry: SystemAdminEndpointRegistryService,
  ) {}

  async build(requestId?: string) {
    const [shell, summary] = await Promise.all([
      this.platformShell.snapshot(requestId),
      this.systemAdminSummary.dashboard(),
    ]);

    return {
      success: true,
      platformAdminPack: {
        shell: shell.platformShell,
        summary: summary.systemAdminSummary,
        endpoints: this.endpointRegistry.build().adminEndpointRegistry,
      },
    };
  }
}
