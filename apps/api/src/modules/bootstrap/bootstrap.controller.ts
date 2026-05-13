import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  VERSION_NEUTRAL,
} from "@nestjs/common";
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { BootstrapFirstOwnerDto } from "./dto/bootstrap-first-owner.dto";
import { BootstrapFirstOwnerResponseDto } from "./dto/bootstrap-first-owner-response.dto";
import { FirstOwnerBootstrapService } from "./bootstrap.service";

@ApiTags("first-owner-bootstrap")
@Controller({
  path: "bootstrap",
  version: VERSION_NEUTRAL,
})
export class FirstOwnerBootstrapController {
  constructor(private readonly service: FirstOwnerBootstrapService) {}

  @Post("first-owner")
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiHeader({
    name: "x-owner-bootstrap-token",
    required: false,
    description:
      "One-time first-owner bootstrap token. Rotate immediately if exposed.",
  })
  @ApiOperation({
    summary: "Bootstrap the first real owner account after Supabase signup",
  })
  bootstrapFirstOwner(
    @Body() dto: BootstrapFirstOwnerDto,
    @Headers("authorization") authorization?: string,
    @Headers("x-owner-bootstrap-token") ownerBootstrapToken?: string,
  ): Promise<BootstrapFirstOwnerResponseDto> {
    return this.service.bootstrapFirstOwner(dto, {
      authorization,
      ownerBootstrapToken,
    });
  }
}
