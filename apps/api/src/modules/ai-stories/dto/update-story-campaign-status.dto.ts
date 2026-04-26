import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateStoryCampaignStatusDto {
  @IsString()
  @MaxLength(120)
  campaignId!: string;

  @IsString()
  @IsIn(["budget_held", "review", "scheduled", "active", "paused", "completed", "cancelled"])
  status!:
    | "budget_held"
    | "review"
    | "scheduled"
    | "active"
    | "paused"
    | "completed"
    | "cancelled";

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
