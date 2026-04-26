import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";

@Injectable()
export class ParseBoolPipe implements PipeTransform<unknown, boolean> {
  constructor(
    private readonly options?: {
      fieldName?: string;
    },
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata): boolean {
    const fieldName = this.options?.fieldName || "value";

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();

      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }

      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }

    throw new BadRequestException({
      code: "INVALID_BOOLEAN",
      error: "BadRequest",
      message: `${fieldName} must be a boolean`,
    });
  }
}
