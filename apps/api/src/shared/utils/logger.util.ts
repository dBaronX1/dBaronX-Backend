import { SecurityUtil } from "./security.util";

export type LogLevel = "debug" | "info" | "warn" | "error";

export class LoggerUtil {
  static log(event: string, payload: Record<string, unknown> = {}): void {
    this.write("info", event, payload);
  }

  static info(event: string, payload: Record<string, unknown> = {}): void {
    this.write("info", event, payload);
  }

  static warn(event: string, payload: Record<string, unknown> = {}): void {
    this.write("warn", event, payload);
  }

  static error(event: string, payload: Record<string, unknown> = {}): void {
    this.write("error", event, payload);
  }

  static debug(event: string, payload: Record<string, unknown> = {}): void {
    if (!this.debugEnabled()) {
      return;
    }

    this.write("debug", event, payload);
  }

  static write(
    level: LogLevel,
    event: string,
    payload: Record<string, unknown> = {},
  ): void {
    const entry = {
      level,
      event,
      ...SecurityUtil.redactObject(payload),
      timestamp: new Date().toISOString(),
    };

    const serialized = JSON.stringify(entry);

    if (level === "error") {
      console.error(serialized);
      return;
    }

    if (level === "warn") {
      console.warn(serialized);
      return;
    }

    if (level === "debug") {
      console.debug(serialized);
      return;
    }

    console.log(serialized);
  }

  private static debugEnabled(): boolean {
    return ["1", "true", "yes", "on"].includes(
      String(process.env.DEBUG_LOGS || process.env.LOG_DEBUG || "").toLowerCase(),
    );
  }
}