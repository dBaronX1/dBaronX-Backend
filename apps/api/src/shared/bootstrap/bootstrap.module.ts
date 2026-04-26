import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppBootstrapService } from "./app-bootstrap.service";
import { EnvironmentContractService } from "../services/environment-contract.service";
import { LaunchGateService } from "../services/launch-gate.service";
import { StartupAuditLogService } from "../services/startup-audit-log.service";
import { SystemStartupSequenceService } from "../services/system-startup-sequence.service";
import { CrossServiceCompatibilityService } from "../services/cross-service-compatibility.service";
import { FastapiIntelligenceConsumptionService } from "../services/fastapi-intelligence-consumption.service";
import { FastapiIntelligenceHttpService } from "../services/fastapi-intelligence-http.service";
import { FastapiRuntimeCompatibilityService } from "../services/fastapi-runtime-compatibility.service";
import { RuntimeBlockersService } from "../services/runtime-blockers.service";
import { ServiceRuntimeRegistryService } from "../services/service-runtime-registry.service";
import { InternalRequestHeadersService } from "../services/internal-request-headers.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    StartupAuditLogService,
    ServiceRuntimeRegistryService,
    RuntimeBlockersService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiIntelligenceConsumptionService,
    FastapiRuntimeCompatibilityService,
    CrossServiceCompatibilityService,
    EnvironmentContractService,
    LaunchGateService,
    SystemStartupSequenceService,
    AppBootstrapService,
  ],
  exports: [
    StartupAuditLogService,
    ServiceRuntimeRegistryService,
    RuntimeBlockersService,
    InternalRequestHeadersService,
    FastapiIntelligenceHttpService,
    FastapiIntelligenceConsumptionService,
    FastapiRuntimeCompatibilityService,
    CrossServiceCompatibilityService,
    EnvironmentContractService,
    LaunchGateService,
    SystemStartupSequenceService,
    AppBootstrapService,
  ],
})
export class BootstrapModule {}
