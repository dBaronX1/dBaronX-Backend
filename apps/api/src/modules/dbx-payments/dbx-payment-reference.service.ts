import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";

@Injectable()
export class DbxPaymentReferenceService {
  createReference(prefix = "DBX"): string {
    const now = new Date();
    const date = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      String(now.getUTCDate()).padStart(2, "0"),
    ].join("");

    const entropy = randomBytes(8).toString("hex").toUpperCase();

    return `${prefix}-${date}-${entropy}`;
  }
}
