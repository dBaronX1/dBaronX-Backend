import { Injectable, Logger } from "@nestjs/common";

export interface StartupAuditEntry {
  source: string;
  status: "pass" | "fail" | "warn";
  message: string;
  details?: Record<string, unknown>;
}

@Injectable()
export class StartupAuditLogService {
  private readonly logger = new Logger(StartupAuditLogService.name);
  private readonly entries: StartupAuditEntry[] = [];

  record(entry: StartupAuditEntry): void {
    this.entries.push(entry);

    const payload = JSON.stringify({
      source: entry.source,
      status: entry.status,
      message: entry.message,
      details: entry.details || {},
      timestamp: new Date().toISOString(),
    });

    if (entry.status === "fail") {
      this.logger.error(payload);
      return;
    }

    if (entry.status === "warn") {
      this.logger.warn(payload);
      return;
    }

    this.logger.log(payload);
  }

  getEntries(): StartupAuditEntry[] {
    return [...this.entries];
  }

  getSummary(): {
    total: number;
    pass: number;
    warn: number;
    fail: number;
  } {
    return this.entries.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] += 1;
        return acc;
      },
      { total: 0, pass: 0, warn: 0, fail: 0 },
    );
  }

  clear(): void {
    this.entries.length = 0;
  }
}
