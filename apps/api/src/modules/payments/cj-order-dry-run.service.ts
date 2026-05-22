import { Injectable } from "@nestjs/common";

@Injectable()
export class CjOrderDryRunService {
  preview(input: Record<string, unknown>) {
    return {
      mode: "dry_run",
      live_order_placed: false,
      live_order_blocked: true,
      preview: input,
    };
  }
}
