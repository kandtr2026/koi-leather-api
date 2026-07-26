import { ApiProperty } from '@nestjs/swagger';

export class UploadedImageDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() thumbnailUrl: string;
  @ApiProperty() mediumUrl: string;
  @ApiProperty() altText: string;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() displayOrder: number;
  @ApiProperty() width: number;
  @ApiProperty() height: number;
  @ApiProperty() mimeType: string;
  @ApiProperty() fileSize: number;
}

export class UploadResponseDto {
  @ApiProperty({ type: [UploadedImageDto] })
  images: UploadedImageDto[];
  @ApiProperty() count: number;
}

export class ReorderImagesDto {
  @ApiProperty({ description: 'Array of { id, displayOrder }' })
  items: { id: string; displayOrder: number }[];
}

export class SetPrimaryImageDto {
  @ApiProperty({ description: 'Image ID to set as primary' })
  imageId: string;
}
