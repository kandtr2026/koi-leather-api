import { PartialType } from '@nestjs/swagger';
import { CreateImageCategoryDto } from './create-image-category.dto';

export class UpdateImageCategoryDto extends PartialType(CreateImageCategoryDto) {}
