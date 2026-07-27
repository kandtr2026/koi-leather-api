import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateImageCategoryDto {
  @ApiPropertyOptional({ description: 'Unique code — auto-generated from name if omitted' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'Display name of the image category' })
  @IsString()
  name: string;
}
