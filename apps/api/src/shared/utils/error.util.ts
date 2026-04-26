export class ErrorUtil {
  static message(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Unknown error";
  }

  static stack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack;
    return undefined;
  }

  static code(error: unknown): string | undefined {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof (error as { code?: unknown }).code === "string"
    ) {
      return (error as { code: string }).code;
    }

    return undefined;
  }

  static toResponse(error: unknown, fallbackMessage = "Internal server error") {
    return {
      success: false,
      message: this.message(error) || fallbackMessage,
      code: this.code(error),
      timestamp: new Date().toISOString(),
    };
  }
}
