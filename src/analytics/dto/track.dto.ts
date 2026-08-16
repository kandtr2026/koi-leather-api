import { IsString, IsOptional, MaxLength, IsInt, Min } from "class-validator";

export class TrackPageViewDto {
  @IsString()
  @MaxLength(512)
  visitorHash: string;

  @IsString()
  @MaxLength(512)
  path: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  userAgent?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  scrollDepth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  timeOnPage?: number;
}

export class TrackContactClickDto {
  @IsString()
  @MaxLength(512)
  visitorHash: string;

  @IsString()
  @MaxLength(100)
  channel: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  productName?: string;
}
