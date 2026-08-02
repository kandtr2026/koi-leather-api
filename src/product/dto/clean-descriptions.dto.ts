import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

/**
 * Tham số cho POST /products/descriptions/clean.
 *
 * ValidationPipe của app bật forbidNonWhitelisted → mọi field phải khai ở đây,
 * không thì request bị chặn.
 */
export class CleanDescriptionsDto {
  @ApiPropertyOptional({
    description:
      "true (mặc định) = chỉ báo cáo sẽ dọn gì, KHÔNG ghi DB. " +
      "Gửi false mới ghi thật.",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @ApiPropertyOptional({
    description:
      "Chỉ dọn đúng các sản phẩm này. Bỏ trống = dọn tất cả sản phẩm còn rác.",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  ids?: string[];

  @ApiPropertyOptional({
    description:
      "Giới hạn số sản phẩm xử lý mỗi lượt. Dùng để dọn dần cho chắc, hoặc " +
      "tránh chạm giới hạn thời gian của hàm serverless.",
    minimum: 1,
    maximum: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;
}
