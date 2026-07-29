import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class CreateMaterialCategoryDto {
  @ApiProperty({ description: 'Tên hiển thị của danh mục nguyên liệu', example: 'Da bò Vegtan' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Mã code duy nhất (tự động sinh nếu không cung cấp)', example: 'DA_BO_VEGTAN', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ description: 'Mô tả chi tiết danh mục nguyên liệu', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Thứ tự hiển thị', example: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}