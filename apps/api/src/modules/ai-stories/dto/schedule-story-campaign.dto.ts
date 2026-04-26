import {
  IsArray,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class ScheduleStoryCampaignDto {
  @IsString()
  @MaxLength(120)
  campaignId!: string;

  @IsDateString()
  scheduledAt!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocales?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  distributionChannels?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actorId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
