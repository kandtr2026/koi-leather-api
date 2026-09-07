import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query cho Thư viện ảnh (chỉ đọc). Các cờ lọc (watermark/khacTen/...) là CHUỖI
 * chứ không phải boolean: ValidationPipe bật enableImplicitConversion, mà
 * class-transformer ép "false" -> true (chuỗi khác rỗng là truthy) nên boolean
 * query không đáng tin. Frontend chỉ gửi cờ khi BẬT ("true"/"1"); service tự
 * diễn giải bằng hàm bat().
 */
export class QueryImagesDto {
  @ApiPropertyOptional({ description: "Trang (bắt đầu 1)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "Số ảnh mỗi trang (1..120)" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(120)
  pageSize?: number;

  @ApiPropertyOptional() @IsOptional() @IsString() nguon?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() loai?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() danhMuc?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() spSlug?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() phanLoai?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() watermark?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() khacTen?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() biaBai?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lifestyle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() chuaGan?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() trung?: string;

  @ApiPropertyOptional({ description: "Tìm trong spTen/spSlug/moTa/url" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ description: "moiNhat | nangNhat | to" })
  @IsOptional()
  @IsString()
  sort?: string;
}
