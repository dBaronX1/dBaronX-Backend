import { Injectable } from "@nestjs/common";
import { IdUtil } from "../../shared/utils/id.util";

@Injectable()
export class DbxPaymentReferenceService {
  createReference(prefix = "DBX"): string {
    return IdUtil.reference(prefix, 8);
  }

  normalizeForLookup(reference: string): string {
    return this.normalizeLegacyReference(reference);
  }

  toLookupCandidates(reference: string): string[] {
    const raw = String(reference || "").trim();
    if (!raw) return [];

    const normalized = this.normalizeLegacyReference(raw);
    const upper = raw.toUpperCase();

    return Array.from(new Set([raw, normalized, upper].filter(Boolean)));
  }

  private normalizeLegacyReference(reference: string): string {
    const clean = String(reference || "").trim();

    const standard = clean.match(/^([a-z0-9]{2,16})-(\d{8})-([a-f0-9]{16,64})$/i);
    if (standard) {
      return `${standard[1].toUpperCase()}-${standard[2]}-${standard[3].toUpperCase()}`;
    }

    const compact = clean.match(/^([a-z0-9]{2,16})[-_: ]?(\d{8})[-_: ]?([a-f0-9]{16,64})$/i);
    if (compact) {
      return `${compact[1].toUpperCase()}-${compact[2]}-${compact[3].toUpperCase()}`;
    }

    return clean;
  }
}
