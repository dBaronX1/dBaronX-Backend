import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import {
  ECONOMIC_ASSET_TYPES,
  ECONOMIC_DIRECTIONS,
  ECONOMIC_EVENT_TYPES,
  ECONOMIC_PAYMENT_RAILS,
  ECONOMIC_SOURCE_MODULES,
  ECONOMIC_STATUSES,
  EconomicAssetType,
  EconomicDirection,
  EconomicEvent,
  EconomicEventInput,
  EconomicEventRepository,
  EconomicEventType,
  EconomicPaymentRail,
  EconomicSourceModule,
  EconomicStatus,
  EconomicEventValidationResult,
} from "../types/economic-event.types";

const SECRET_FIELD_PATTERN = /(secret|token|password|private[_-]?key|seed[_-]?phrase|authorization|cookie|signature)/i;
const SETTLEMENT_STATUSES = new Set<EconomicStatus>(["verified", "settled"]);

type PersistEconomicEventInput = Omit<EconomicEventInput, "sourceRef" | "amountMinorUnits" | "assetType"> &
  Partial<Pick<EconomicEventInput, "sourceRef" | "amountMinorUnits" | "assetType">> & {
    amount?: number | string;
    referenceId?: string;
  };

type PersistEconomicEventResult = EconomicEventValidationResult & {
  ready: boolean;
  persisted: boolean;
};

@Injectable()
export class EconomicEventService {
  constructor(
    @Optional()
    @Inject("EconomicEventRepository")
    private readonly repository?: EconomicEventRepository,
  ) {}

  getSupportedModules(): EconomicSourceModule[] {
    return [...ECONOMIC_SOURCE_MODULES];
  }

  getSupportedEventTypes(): EconomicEventType[] {
    return [...ECONOMIC_EVENT_TYPES];
  }

  getSupportedPaymentRails(): EconomicPaymentRail[] {
    return [...ECONOMIC_PAYMENT_RAILS];
  }

  readiness() {
    const supportedModules = this.getSupportedModules();
    const supportedEventTypes = this.getSupportedEventTypes();
    const supportedPaymentRails = this.getSupportedPaymentRails();
    const ledgerReady = true;
    const walletReady = true;
    const payoutReady = false;
    const orderSyncReady = true;
    const blockers = ["live_payout_settlement_not_enabled_contract_only"];

    return {
      success: true,
      blockers,
      supportedModules,
      supportedEventTypes,
      supportedPaymentRails,
      ledgerReady,
      walletReady,
      payoutReady,
      orderSyncReady,
      safeMode: true,
      timestamp: new Date().toISOString(),
    };
  }


  async persist(input: PersistEconomicEventInput): Promise<PersistEconomicEventResult> {
    const normalizedInput: EconomicEventInput = {
      ...input,
      sourceRef: input.sourceRef || input.referenceId || "",
      amountMinorUnits: Number(input.amountMinorUnits ?? input.amount ?? 0),
      assetType: input.assetType || "fiat",
    };

    const result = this.validate(normalizedInput);
    if (!result.valid || !result.event) {
      return {
        ...result,
        ready: false,
        persisted: false,
      };
    }

    if (!this.repository) {
      return {
        ...result,
        ready: true,
        persisted: false,
        blockers: ["economic_event_persistence_pending"],
      };
    }

    const existing = await this.repository.findByIdempotencyKey(result.event.idempotencyKey);
    if (existing) {
      return {
        valid: true,
        ready: true,
        persisted: true,
        blockers: [],
        event: existing,
        auditPayload: this.toAuditPayload(existing),
      };
    }

    const saved = await this.repository.append(result.event);
    return {
      valid: true,
      ready: true,
      persisted: true,
      blockers: [],
      event: saved,
      auditPayload: this.toAuditPayload(saved),
    };
  }

  async record(input: EconomicEventInput): Promise<EconomicEventValidationResult> {
    const result = this.validate(input);
    if (!result.valid || !result.event) {
      throw new BadRequestException({
        success: false,
        blockers: result.blockers,
        auditPayload: result.auditPayload,
      });
    }

    if (!this.repository) {
      return result;
    }

    const existing = await this.repository.findByIdempotencyKey(result.event.idempotencyKey);
    if (existing) {
      return {
        valid: true,
        blockers: [],
        event: existing,
        auditPayload: this.toAuditPayload(existing),
      };
    }

    const saved = await this.repository.append(result.event);
    return {
      valid: true,
      blockers: [],
      event: saved,
      auditPayload: this.toAuditPayload(saved),
    };
  }

  validate(input: EconomicEventInput): EconomicEventValidationResult {
    const blockers: string[] = [];
    const idempotencyKey = this.normalizeRequiredString(input.idempotencyKey, "idempotencyKey", blockers);
    const eventType = this.normalizeEnum(input.eventType, ECONOMIC_EVENT_TYPES, "eventType", blockers);
    const sourceModule = this.normalizeEnum(input.sourceModule, ECONOMIC_SOURCE_MODULES, "sourceModule", blockers);
    const sourceRef = this.normalizeRequiredString(input.sourceRef, "sourceRef", blockers);
    const currency = this.normalizeCurrency(input.currency, blockers);
    const amountMinorUnits = this.normalizeAmount(input.amountMinorUnits, blockers);
    const assetType = this.normalizeEnum(input.assetType, ECONOMIC_ASSET_TYPES, "assetType", blockers);
    const paymentRail = this.normalizeEnum(input.paymentRail, ECONOMIC_PAYMENT_RAILS, "paymentRail", blockers);
    const direction = this.normalizeEnum(input.direction, ECONOMIC_DIRECTIONS, "direction", blockers);
    const status = this.normalizeEnum(input.status ?? "requested", ECONOMIC_STATUSES, "status", blockers);
    const createdAt = this.normalizeCreatedAt(input.createdAt);
    const metadata = this.sanitizeMetadata(input.metadata || {});

    if (sourceModule && eventType && !this.eventMatchesSourceModule(eventType, sourceModule)) {
      blockers.push("event_type_source_module_mismatch");
    }

    if (status && SETTLEMENT_STATUSES.has(status) && !this.hasVerifierEvidence(metadata)) {
      blockers.push("verifier_evidence_required_for_verified_or_settled_status");
    }

    const event = blockers.length === 0 ? {
      eventId: this.normalizeOptionalString(input.eventId) || this.generateEventId(),
      eventType: eventType as EconomicEventType,
      sourceModule: sourceModule as EconomicSourceModule,
      sourceRef,
      userId: input.userId ?? null,
      accountId: input.accountId ?? null,
      currency,
      amountMinorUnits,
      assetType: assetType as EconomicAssetType,
      paymentRail: paymentRail as EconomicPaymentRail,
      direction: direction as EconomicDirection,
      status: status as EconomicStatus,
      idempotencyKey,
      metadata,
      createdAt,
    } satisfies EconomicEvent : undefined;

    return {
      valid: blockers.length === 0,
      blockers,
      event,
      auditPayload: event ? this.toAuditPayload(event) : this.toAuditPayload({
        eventId: String(input.eventId || "invalid"),
        eventType: String(input.eventType || "invalid") as EconomicEventType,
        sourceModule: String(input.sourceModule || "invalid") as EconomicSourceModule,
        sourceRef: String(input.sourceRef || "invalid"),
        currency: String(input.currency || "invalid"),
        amountMinorUnits: Number(input.amountMinorUnits || 0),
        assetType: String(input.assetType || "invalid") as EconomicAssetType,
        paymentRail: String(input.paymentRail || "invalid") as EconomicPaymentRail,
        direction: String(input.direction || "invalid") as EconomicDirection,
        status: String(input.status || "requested") as EconomicStatus,
        idempotencyKey: String(input.idempotencyKey || "invalid"),
        metadata,
        createdAt,
      }),
    };
  }

  toAuditPayload(event: EconomicEvent): Record<string, unknown> {
    return {
      eventId: event.eventId,
      eventType: event.eventType,
      sourceModule: event.sourceModule,
      sourceRef: event.sourceRef,
      userId: event.userId ? "present" : null,
      accountId: event.accountId ? "present" : null,
      currency: event.currency,
      amountMinorUnits: event.amountMinorUnits,
      assetType: event.assetType,
      paymentRail: event.paymentRail,
      direction: event.direction,
      status: event.status,
      idempotencyKeyHash: this.hashForAudit(event.idempotencyKey),
      metadata: this.sanitizeMetadata(event.metadata || {}),
      createdAt: event.createdAt,
    };
  }

  private normalizeRequiredString(value: unknown, field: string, blockers: string[]): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) blockers.push(`${field}_required`);
    return normalized;
  }

  private normalizeOptionalString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
  }

  private normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T, field: string, blockers: string[]): T[number] | undefined {
    const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
    if (!(allowed as readonly string[]).includes(normalized)) {
      blockers.push(`${field}_unsupported`);
      return undefined;
    }
    return normalized as T[number];
  }

  private normalizeCurrency(value: unknown, blockers: string[]): string {
    const normalized = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (!/^[A-Z0-9_]{2,16}$/.test(normalized)) blockers.push("currency_invalid");
    return normalized;
  }

  private normalizeAmount(value: unknown, blockers: string[]): number {
    const amount = typeof value === "string" ? Number(value) : Number(value);
    if (!Number.isSafeInteger(amount) || amount <= 0) blockers.push("amount_minor_units_must_be_positive_safe_integer");
    return amount;
  }

  private normalizeCreatedAt(value: unknown): string {
    if (typeof value === "string" && !Number.isNaN(Date.parse(value))) return new Date(value).toISOString();
    return new Date().toISOString();
  }

  private eventMatchesSourceModule(eventType: string, sourceModule: string): boolean {
    if (eventType.startsWith("refund.")) return ["payments", "commerce", "wallet"].includes(sourceModule);
    if (eventType.startsWith("payout.")) return ["payouts", "affiliate", "wallet"].includes(sourceModule);
    if (eventType.startsWith("ai_stories.")) return sourceModule === "ai_stories";
    return eventType.startsWith(`${sourceModule}.`);
  }

  private hasVerifierEvidence(metadata: Record<string, unknown>): boolean {
    const evidence = metadata.verifierEvidence as Record<string, unknown> | undefined;
    return Boolean(
      evidence &&
      typeof evidence.verifier === "string" &&
      typeof evidence.reference === "string" &&
      evidence.reference.trim() &&
      typeof evidence.verifiedAt === "string" &&
      !Number.isNaN(Date.parse(evidence.verifiedAt)),
    );
  }

  private sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(metadata).reduce<Record<string, unknown>>((safe, [key, value]) => {
      if (SECRET_FIELD_PATTERN.test(key)) {
        safe[key] = "[redacted]";
      } else if (value && typeof value === "object" && !Array.isArray(value)) {
        safe[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        safe[key] = value;
      }
      return safe;
    }, {});
  }

  private generateEventId(): string {
    return `econ_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  }

  private hashForAudit(value: string): string {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
    }
    return `h${hash.toString(16).padStart(8, "0")}`;
  }
}
