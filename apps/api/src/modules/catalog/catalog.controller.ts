import { Controller, Get, Param, Query, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Public } from "../../shared/decorators/public.decorator";
import { CatalogService } from "./catalog.service";

@ApiTags("catalog")
@Public()
@Controller({ path: "catalog", version: VERSION_NEUTRAL })
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get("products")
  listProducts(@Query("limit") limit?: string) {
    return this.catalog.listProducts({ limit: Number(limit || 50) || 50 });
  }

  @Get("products/:handle")
  productByHandle(@Param("handle") handle: string) {
    return this.catalog.productByHandle(handle);
  }

  @Get("readiness")
  readiness() {
    return this.catalog.readiness();
  }
}
