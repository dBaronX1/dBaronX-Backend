import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { SystemShellManifestService } from "./system-shell-manifest.service";

@ApiTags("system-shell-manifest")
@Controller({
  path: "system/shell-manifest",
  version: "1",
})
@UseGuards(InternalAuthGuard)
export class SystemShellManifestController {
  constructor(
    private readonly shellManifest: SystemShellManifestService,
  ) {}

  @Get()
  @ApiOperation({
    summary: "Internal NestJS shell manifest for canonical phase closure",
  })
  async getManifest() {
    return this.shellManifest.build();
  }
}
