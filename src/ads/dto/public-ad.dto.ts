import { IsString, MaxLength, IsOptional } from "class-validator";

export class AdClickDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  gclid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  gbraid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  wbraid?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  landingPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  channel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  productName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  visitorHash?: string;
}

export class AdContactDto {
  @IsString()
  @MaxLength(16) // Mã thật chỉ 6 ký tự
  token: string;

  @IsString()
  @MaxLength(32)
  channel: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  productName?: string;
}
