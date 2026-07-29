import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class SaveShopeeConfigDto {
  @ApiProperty({ example: 1000000, description: 'Partner ID trên Shopee Open Platform' })
  @IsInt()
  @Min(1)
  partnerId: number;

  @ApiProperty({ description: 'Partner Key — được mã hoá trước khi lưu DB' })
  @IsString()
  @IsNotEmpty()
  // Partner key của Shopee là hex khá dài; đặt sàn thấp để không chặn sandbox.
  @MinLength(16)
  partnerKey: string;

  @ApiProperty({ example: 123456789, description: 'Shop ID' })
  @IsInt()
  @Min(1)
  shopId: number;

  @ApiPropertyOptional({ enum: ['live', 'sandbox'], default: 'live' })
  @IsOptional()
  @IsIn(['live', 'sandbox'])
  env?: string;
}

export class ExchangeCodeDto {
  @ApiProperty({ description: 'Tham số code Shopee trả về sau khi chủ shop đồng ý' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'shop_id Shopee trả kèm code. Bỏ trống thì dùng shop_id đã khai báo.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  shopId?: number;
}
