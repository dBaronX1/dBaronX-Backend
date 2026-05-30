import { Controller, Get, Param, Query, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Public()
@Controller({ path: "catalog", version: VERSION_NEUTRAL })
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("products")
  @ApiOperation({ summary: "Public Medusa-backed normalized product catalog" })
  list(@Query("limit") limit?: string) {
    return this.catalog.listProducts({ limit: Number(limit || 24) || 24 });
  }

  @Get("products/:handle")
  @ApiOperation({ summary: "Public Medusa-backed normalized product detail by handle" })
  byHandle(@Param("handle") handle: string) {
    return this.catalog.productByHandle(decodeURIComponent(handle || ""));
  }

  @Get("readiness")
  @ApiOperation({ summary: "Public catalog gateway readiness" })
  readiness() {
    return this.catalog.readiness();
  }
}
