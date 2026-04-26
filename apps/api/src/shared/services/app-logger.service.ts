import { Injectable, LoggerService } from "@nestjs/common";
import { RequestContextService } from "./request-context.service";

type LogLevel = "error" | "warn" | "log" | "debug" | "verbose";

@Injectable()
export class AppLoggerService implements LoggerService {
  constructor(private readonly requestContext: RequestContextService) {}

  log(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    this.write("log", message, context, meta);
  }

  error(
    message: unknown,
    trace?: string,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    this.write("error", message, context, {
      ...(meta || {}),
      ...(trace ? { trace } : {}),
    });
  }

  warn(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    this.write("warn", message, context, meta);
  }

  debug(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    this.write("debug", message, context, meta);
  }

  verbose(message: unknown, context?: string, meta?: Record<string, unknown>): void {
    this.write("verbose", message, context, meta);
  }

  event(name: string, meta?: Record<string, unknown>, context = "Event"): void {
    this.write("log", `event:${name}`, context, meta);
  }

  audit(action: string, meta?: Record<string, unknown>, context = "Audit"): void {
    this.write("log", `audit:${action}`, context, meta);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    meta?: Record<string, unknown>,
  ): void {
    const payload = {
      level,
      message: this.normalizeMessage(message),
      context: context || "App",
      requestId: this.requestContext.requestId(),
      path: this.requestContext.get<string>("path") || null,
      method: this.requestContext.get<string>("method") || null,
      ip: this.requestContext.get<string>("ip") || null,
      actorId: this.requestContext.actorId(),
      meta: this.redact(meta || {}),
      timestamp: new Date().toISOString(),
    };

    const serialized = JSON.stringify(payload);

    switch (level) {
      case "error":
        console.error(serialized);
        return;
      case "warn":
        console.warn(serialized);
        return;
      case "debug":
      case "verbose":
        if (this.debugEnabled()) console.debug(serialized);
        return;
      default:
        console.log(serialized);
    }
  }

  private normalizeMessage(message: unknown): string {
    if (typeof message === "string") return message;
    if (message instanceof Error) return message.message;

    try {
      return JSON.stringify(message);
    } catch {
      return String(message);
    }
  }

  private redact(input: Record<string, unknown>): Record<string, unknown> {
    const output: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input)) {
      const lowered = key.toLowerCase();

      if (
        lowered.includes("password") ||
        lowered.includes("token") ||
        lowered.includes("secret") ||
        lowered.includes("authorization") ||
        lowered.includes("apikey") ||
        lowered.includes("api_key") ||
        lowered.includes("service_role")
      ) {
        output[key] = "[REDACTED]";
        continue;
      }

      output[key] = value;
    }

    return output;
  }

  private debugEnabled(): boolean {
    return ["1", "true", "yes", "on"].includes(
      String(process.env.DEBUG_LOGS || "").toLowerCase(),
    );
  }
}
