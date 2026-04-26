import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from "@nestjs/common";

@Injectable()
export class UUIDPipe implements PipeTransform<unknown, string> {
  constructor(
    private readonly options?: {
      fieldName?: string;
      allowEmpty?: boolean;
    },
  ) {}

  private static readonly UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  transform(value: unknown, _metadata: ArgumentMetadata): string {
    const fieldName = this.options?.fieldName || "value";
    const raw = String(value ?? "").trim();

    if (!raw && this.options?.allowEmpty) {
      return raw;
    }

    if (!UUIDPipe.UUID_REGEX.test(raw)) {
      throw new BadRequestException({
        code: "INVALID_UUID",
        error: "BadRequest",
        message: `${fieldName} must be a valid UUID`,
      });
    }

    return raw.toLowerCase();
  }
}
