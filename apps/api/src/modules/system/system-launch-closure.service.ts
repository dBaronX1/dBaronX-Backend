import { Injectable } from "@nestjs/common";
import { CommerceBoundaryAuditService } from "../commerce/commerce-boundary-audit.service";
import { CommerceHealthService } from "../commerce/commerce-health.service";
import { LaunchGateService } from "../../shared/services/launch-gate.service";
import { SystemBootstrapHardeningService } from "./system-bootstrap-hardening.service";
import { SystemClosureService } from "./system-closure.service";

@Injectable()
export class SystemLaunchClosureService {
  constructor(
    private readonly systemClosure: SystemClosureService,
    private readonly systemBootstrapHardening: SystemBootstrapHardeningService,
    private readonly commerceHealth: CommerceHealthService,
    private readonly commerceBoundaryAudit: CommerceBoundaryAuditService,
    private readonly launchGate: LaunchGateService,
  ) {}

  async build(requestId?: string) {
    const [closure, hardening, commerce] = await Promise.all([
      this.systemClosure.snapshot(requestId),
      this.systemBootstrapHardening.build(requestId),
      this.commerceHealth.snapshot(requestId),
    ]);

    const boundary = this.commerceBoundaryAudit.build().commerceBoundaryAudit;
    const launchGate = this.launchGate.snapshot().launchGate;

    const ready =
      closure.systemClosure.closed &&
      hardening.bootstrapHardening.hardened &&
      commerce.commerceHealth.status === "ready" &&
      boundary.enforced &&
      launchGate.ready;

    const blockers = [
      ...closure.systemClosure.blockers,
      ...hardening.bootstrapHardening.blockers,
      ...(commerce.commerceHealth.status !== "ready"
        ? ["commerce_health_degraded"]
        : []),
      ...(!boundary.enforced ? ["commerce_boundary_not_enforced"] : []),
      ...(!launchGate.ready ? launchGate.blockers : []),
    ];

    return {
      success: true,
      launchClosure: {
        ready,
        blockers: [...new Set(blockers)],
        closure: closure.systemClosure,
        bootstrapHardening: hardening.bootstrapHardening,
        commerce: commerce.commerceHealth,
        boundary,
        launchGate,
      },
    };
  }
}
