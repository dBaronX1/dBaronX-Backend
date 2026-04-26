import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";

@Injectable()
export class ParseIntPipe implements PipeTransform<unknown, number> {
  constructor(
    private readonly options?: {
      min?: number;
      max?: number;
      fieldName?: string;
    },
  ) {}

  transform(value: unknown, _metadata: ArgumentMetadata): number {
    const fieldName = this.options?.fieldName || "value";

    if (value === undefined || value === null || value === "") {
      throw new BadRequestException({
        code: "INVALID_INTEGER",
        error: "BadRequest",
        message: `${fieldName} must be an integer`,
      });
    }

    const parsed = Number(value);

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException({
        code: "INVALID_INTEGER",
        error: "BadRequest",
        message: `${fieldName} must be an integer`,
      });
    }

    if (this.options?.min !== undefined && parsed < this.options.min) {
      throw new BadRequestException({
        code: "INTEGER_TOO_SMALL",
        error: "BadRequest",
        message: `${fieldName} must be greater than or equal to ${this.options.min}`,
      });
    }

    if (this.options?.max !== undefined && parsed > this.options.max) {
      throw new BadRequestException({
        code: "INTEGER_TOO_LARGE",
        error: "BadRequest",
        message: `${fieldName} must be less than or equal to ${this.options.max}`,
      });
    }

    return parsed;
  }
}
