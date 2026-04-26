export class ResponseUtil {
  static success<T>(data: T, message = "Success") {
    return {
      success: true as const,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static fail(message: string, details?: unknown, code?: string | number) {
    return {
      success: false as const,
      message,
      code,
      details: details ?? null,
      timestamp: new Date().toISOString(),
    };
  }
}
