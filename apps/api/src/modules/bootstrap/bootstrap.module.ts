import { Module } from "@nestjs/common";
import { SharedModule } from "../../shared/shared.module";
import { FirstOwnerBootstrapController } from "./bootstrap.controller";
import { FirstOwnerBootstrapService } from "./bootstrap.service";

@Module({
  imports: [SharedModule],
  controllers: [FirstOwnerBootstrapController],
  providers: [FirstOwnerBootstrapService],
})
export class FirstOwnerBootstrapModule {}
