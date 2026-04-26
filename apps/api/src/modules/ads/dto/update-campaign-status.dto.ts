import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class UpdateCampaignStatusDto {
  @IsString()
  @MaxLength(120)
  campaignId!: string;

  @IsString()
  @IsIn(["budget_held", "active", "paused", "completed", "cancelled"])
  status!: "budget_held" | "active" | "paused" | "completed" | "cancelled";

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
