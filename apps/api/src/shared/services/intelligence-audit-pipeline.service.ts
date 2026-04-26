import { Injectable } from "@nestjs/common";
import {
  DecisionTracePersistenceBridgeService,
  PersistDecisionTraceInput,
} from "./decision-trace-persistence-bridge.service";

@Injectable()
export class IntelligenceAuditPipelineService {
  constructor(
    private readonly decisionTracePersistence: DecisionTracePersistenceBridgeService,
  ) {}

  async persistDecisionAudit(input: PersistDecisionTraceInput) {
    return this.decisionTracePersistence.persist(input);
  }

  async persistGuardedDecisionAudit(input: PersistDecisionTraceInput & {
    decisionType: string;
  }) {
    return this.decisionTracePersistence.persist({
      ...input,
      metadata: {
        ...(input.metadata || {}),
        decisionType: input.decisionType,
        auditedBy: "nestjs-economic-brain",
      },
      tags: [...(input.tags || []), "intelligence", "guarded-decision"],
    });
  }
}
