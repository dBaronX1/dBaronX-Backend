import { IsIn, IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class GenerateAiStoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  conceptId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(12000)
  prompt!: string;

  @IsIn(["short", "medium", "long"])
  length!: "short" | "medium" | "long";

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  tone!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  audience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  userId?: string | null;
}
