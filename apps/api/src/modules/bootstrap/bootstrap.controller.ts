import { Body, Controller, Headers, Post } from "@nestjs/common";
import { BootstrapFirstOwnerDto } from "./dto/bootstrap-first-owner.dto";
import { BootstrapFirstOwnerResponseDto } from "./dto/bootstrap-first-owner-response.dto";
import { FirstOwnerBootstrapService } from "./bootstrap.service";

@Controller("bootstrap")
export class FirstOwnerBootstrapController {
  constructor(private readonly service: FirstOwnerBootstrapService) {}

  @Post("first-owner")
  bootstrapFirstOwner(
    @Body() dto: BootstrapFirstOwnerDto,
    @Headers("authorization") authorization?: string,
  ): Promise<BootstrapFirstOwnerResponseDto> {
    return this.service.bootstrapFirstOwner(dto, authorization);
  }
}
