type LogLevel = "info" | "warning" | "error" | "debug";

function redact(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;

  if (Array.isArray(value)) return value.map(redact);

  const output: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const lowered = key.toLowerCase();

    if (
      lowered.includes("token") ||
      lowered.includes("secret") ||
      lowered.includes("authorization") ||
      lowered.includes("cookie") ||
      lowered.includes("password") ||
      lowered.includes("api_key") ||
      lowered.includes("apikey")
    ) {
      output[key] = "[REDACTED]";
    } else {
      output[key] = redact(item);
    }
  }

  return output;
}

export function serverLogEvent(
  event: string,
  payload: Record<string, unknown> = {},
): void {
  const level = (payload.level as LogLevel | undefined) || "info";
  const entry = JSON.stringify({
    event,
    ...(redact(payload) as Record<string, unknown>),
    timestamp: new Date().toISOString(),
  });

  if (level === "error") {
    console.error(entry);
    return;
  }

  if (level === "warning") {
    console.warn(entry);
    return;
  }

  if (level === "debug") {
    if (process.env.DEBUG_LOGS === "true") console.debug(entry);
    return;
  }

  console.log(entry);
}