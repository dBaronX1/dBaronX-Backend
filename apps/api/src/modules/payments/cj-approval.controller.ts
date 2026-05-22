import { Body, Controller, Param, Post, Req, UseGuards, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { InternalAuthGuard } from "../../shared/guards/internal-auth.guard";
import { CjApprovalService } from "./cj-approval.service";
import { CjApprovalDto } from "./dto/cj-approval.dto";
import { CjDisapprovalDto } from "./dto/cj-disapproval.dto";

@ApiTags("admin-fulfillment")
@Controller({ path: "admin/fulfillment", version: VERSION_NEUTRAL })
@UseGuards(InternalAuthGuard)
export class CjApprovalController {
  constructor(private readonly approval: CjApprovalService) {}

  @Post("tasks/:id/approve-cj")
  async approve(@Param("id") id: string, @Body() body: CjApprovalDto, @Req() req: Request) {
    const actor = String(req.headers["x-internal-token"] ? "internal_admin" : "unknown");
    return this.approval.approve(id, body, actor);
  }

  @Post("tasks/:id/disapprove-cj")
  async disapprove(@Param("id") id: string, @Body() body: CjDisapprovalDto, @Req() req: Request) {
    const actor = String(req.headers["x-internal-token"] ? "internal_admin" : "unknown");
    return this.approval.disapprove(id, body, actor);
  }
}
