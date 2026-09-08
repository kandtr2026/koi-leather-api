import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { IsArray } from "class-validator";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiConsumes,
} from "@nestjs/swagger";
import { MediaService } from "./media.service";
import {
  isSupabaseStorageConfigured,
  uploadImageWithVariants,
} from "./supabase-storage";
import * as path from "path";
import * as fs from "fs";
// Lazy Sharp — optional on platforms without native binaries (Vercel Lambda)
function getSharp() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("sharp");
  } catch {
    return null;
  }
}

class RegisterImageDto {
  cloudinaryPublicId?: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  mediumUrl?: string;
  altText?: string;
  isPrimary?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  variantId?: string;
}

class UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

class ReorderDto {
  // PHẢI có decorator class-validator: ValidationPipe toàn cục bật
  // forbidNonWhitelisted, nên property không được whitelist (không decorator)
  // bị loại → "property items should not exist". SPA cũ không gọi reorder nên
  // bug này ẩn tới khi trang quản ảnh mới dùng.
  @IsArray()
  items: { id: string; displayOrder: number }[];
}

@ApiTags("Media")
@Controller("products/:productId/images")
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}

  /**
   * Xử lý 1 file ảnh rồi lưu vào Supabase Storage (bản nhỏ tĩnh). Chỉ lui về đĩa
   * local khi CHƯA cấu hình SUPABASE_SERVICE_ROLE_KEY (dev). Dùng chung cho
   * upload mới + thay ảnh.
   */
  private async processAndStore(
    file: Express.Multer.File,
    productId: string,
  ): Promise<{
    publicUrl: string;
    thumbUrl: string;
    mediumUrl: string;
    width?: number;
    height?: number;
    mimeType: string;
    fileSize: number;
    onSupabase: boolean;
  }> {
    if (isSupabaseStorageConfigured()) {
      return this.storeToSupabase(file, productId);
    }
    return this.storeToLocal(file, productId);
  }

  /**
   * Đẩy lên Supabase Storage: ảnh gốc (≤1600) + bản nhỏ w400/w800/w1200 (PHẢI
   * khớp WIDTHS của koi-storefront/src/lib/image-loader.ts). Cả 3 cột
   * url/thumbnailUrl/mediumUrl lưu CÙNG URL gốc — giống các ảnh Supabase hiện có;
   * loader next/image tự chèn /w{N}/ để lấy bản nhỏ, không tốn hạn mức transform.
   */
  private async storeToSupabase(file: Express.Multer.File, productId: string) {
    const timestamp = Date.now();
    const sharpInstance = getSharp();

    let baseBuf: Buffer, w400: Buffer, w800: Buffer, w1200: Buffer;
    let width: number | undefined, height: number | undefined;

    if (sharpInstance) {
      const meta = await sharpInstance(file.buffer).metadata();
      width = meta.width || undefined;
      height = meta.height || undefined;
      const mk = (w: number, q: number) =>
        sharpInstance(file.buffer)
          .resize(w, undefined, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: q })
          .toBuffer();
      [baseBuf, w400, w800, w1200] = await Promise.all([
        mk(1600, 82),
        mk(400, 80),
        mk(800, 80),
        mk(1200, 80),
      ]);
    } else {
      baseBuf = w400 = w800 = w1200 = file.buffer;
    }

    const key = `${productId}/${timestamp}.webp`;
    const { url } = await uploadImageWithVariants({
      key,
      base: baseBuf,
      variants: [
        { width: 400, buf: w400 },
        { width: 800, buf: w800 },
        { width: 1200, buf: w1200 },
      ],
    });

    return {
      publicUrl: url,
      thumbUrl: url,
      mediumUrl: url,
      width,
      height,
      mimeType: sharpInstance ? "image/webp" : file.mimetype,
      fileSize: baseBuf.length,
      onSupabase: true,
    };
  }

  /** Đường lui khi chưa cấu hình Supabase (chỉ dev): ghi ra đĩa local. */
  private async storeToLocal(file: Express.Multer.File, productId: string) {
    const timestamp = Date.now();
    const slug = `${timestamp}`;
    const sharpInstance = getSharp();

    let webpBuf: Buffer, thumbBuf: Buffer, mediumBuf: Buffer;
    let width: number | undefined, height: number | undefined;

    if (sharpInstance) {
      const meta = await sharpInstance(file.buffer).metadata();
      width = meta.width || undefined;
      height = meta.height || undefined;
      webpBuf = await sharpInstance(file.buffer).webp({ quality: 85 }).toBuffer();
      thumbBuf = await sharpInstance(file.buffer)
        .resize(300, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 70 })
        .toBuffer();
      mediumBuf = await sharpInstance(file.buffer)
        .resize(1200, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } else {
      webpBuf = file.buffer;
      thumbBuf = file.buffer;
      mediumBuf = file.buffer;
    }

    const ext = path.extname(file.originalname) || ".jpg";
    const uploadDir = path.join(process.cwd(), "uploads", "products", productId);
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, `${slug}${ext}`), webpBuf);
    fs.writeFileSync(path.join(uploadDir, `${slug}-thumb${ext}`), thumbBuf);
    fs.writeFileSync(path.join(uploadDir, `${slug}-medium${ext}`), mediumBuf);
    return {
      publicUrl: `/uploads/products/${productId}/${slug}${ext}`,
      thumbUrl: `/uploads/products/${productId}/${slug}-thumb${ext}`,
      mediumUrl: `/uploads/products/${productId}/${slug}-medium${ext}`,
      width,
      height,
      mimeType: sharpInstance ? "image/webp" : file.mimetype,
      fileSize: webpBuf.length,
      onSupabase: false,
    };
  }

  @Put(":imageId/file")
  @ApiOperation({
    summary: "Thay file của ảnh, giữ nguyên vị trí + cờ primary (admin)",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: { file: { type: "string", format: "binary" } },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async replaceFile(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException("File is required");
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image files allowed");
    }

    const stored = await this.processAndStore(file, productId);
    const result = await this.mediaService.replaceImageFile(productId, imageId, {
      cloudinaryUrl: stored.publicUrl,
      thumbnailUrl: stored.thumbUrl,
      mediumUrl: stored.mediumUrl,
      width: stored.width,
      height: stored.height,
      mimeType: stored.mimeType,
      fileSize: stored.fileSize,
    });

    this.logger.log(
      `Replaced image ${imageId} for product ${productId}${stored.onSupabase ? " (Supabase)" : " (local)"}`,
    );
    return result;
  }

  @Post("upload")
  @ApiOperation({ summary: "Upload image → convert to WebP & register" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        altText: { type: "string" },
        imageType: {
          type: "string",
          enum: ["STUDIO", "LIFESTYLE", "CRAFTING", "TEXTURE"],
          description: "Phân loại ảnh: Studio, Lifestyle, Chế tác, Vân da",
        },
        isPrimary: { type: "boolean" },
        variantId: { type: "string" },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @Param("productId", ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body("altText") altText?: string,
    @Body("imageType") imageType?: string,
    @Body("isPrimary") isPrimary?: string,
    @Body("variantId") variantId?: string,
  ) {
    if (!file) throw new BadRequestException("File is required");
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image files allowed");
    }

    const stored = await this.processAndStore(file, productId);

    const result = await this.mediaService.registerImage(
      productId,
      {
        cloudinaryUrl: stored.publicUrl,
        thumbnailUrl: stored.thumbUrl,
        mediumUrl: stored.mediumUrl,
        altText: altText || undefined,
        imageType: imageType || "STUDIO",
        isPrimary: isPrimary === "true",
        width: stored.width,
        height: stored.height,
        mimeType: stored.mimeType,
        fileSize: stored.fileSize,
      },
      variantId || undefined,
    );

    this.logger.log(
      `Uploaded & converted ${file.originalname} → WEBP for product ${productId}${stored.onSupabase ? " (Supabase)" : " (local)"}`,
    );
    return result;
  }

  @Post()
  @ApiOperation({ summary: "Register a Cloudinary image URL for a product" })
  @ApiBody({ type: RegisterImageDto })
  register(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body() dto: RegisterImageDto,
  ) {
    return this.mediaService.registerImage(productId, dto, dto.variantId);
  }

  @Get()
  @ApiOperation({ summary: "Get all images for a product" })
  findAll(@Param("productId", ParseUUIDPipe) productId: string) {
    return this.mediaService.getProductImages(productId);
  }

  @Delete(":imageId")
  @ApiOperation({ summary: "Delete a product image record" })
  remove(@Param("imageId", ParseUUIDPipe) imageId: string) {
    return this.mediaService.deleteImage(imageId);
  }

  @Patch("primary")
  @ApiOperation({ summary: "Set image as primary for product" })
  setPrimary(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body("imageId") imageId: string,
  ) {
    if (!imageId) throw new BadRequestException("imageId is required");
    return this.mediaService.setPrimaryImage(productId, imageId);
  }

  // ⚠️ Route TĨNH phải khai TRƯỚC route động ":imageId": NestJS/Express khớp
  // theo thứ tự khai báo, nên nếu ":imageId" đứng trước thì "reorder" và
  // "bulk-metadata" bị nuốt vào handler đó → ParseUUIDPipe ném 400 "uuid is
  // expected". SPA cũ không gọi reorder/bulk nên bug này ẩn tới khi trang quản
  // ảnh mới (storefront /admin/products) dùng reorder mới lộ.
  @Patch("reorder")
  @ApiOperation({ summary: "Reorder product images" })
  reorder(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body() dto: ReorderDto,
  ) {
    if (!dto.items || !Array.isArray(dto.items)) {
      throw new BadRequestException("items array is required");
    }
    return this.mediaService.reorderImages(productId, dto.items);
  }

  @Patch("bulk-metadata")
  @ApiOperation({ summary: "Bulk update image metadata (types, alt texts)" })
  bulkUpdateMetadata(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body("items")
    items: { id: string; imageType?: string; altText?: string }[],
  ) {
    if (!items || !Array.isArray(items)) {
      throw new BadRequestException("items array is required");
    }
    return this.mediaService.bulkUpdateImageMetadata(productId, items);
  }

  @Patch(":imageId/type")
  @ApiOperation({
    summary:
      "Update image type (STUDIO, LIFESTYLE, CRAFTING, TEXTURE) with auto SEO alt text",
  })
  updateType(
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @Body("imageType") imageType: string,
    @Body("autoGenerateAlt") autoGenerateAlt?: string,
  ) {
    if (!imageType) throw new BadRequestException("imageType is required");
    return this.mediaService.updateImageType(
      imageId,
      imageType,
      autoGenerateAlt !== "false",
    );
  }

  @Patch(":imageId")
  @ApiOperation({ summary: "Update image metadata (imageType, altText)" })
  updateMetadata(
    @Param("imageId", ParseUUIDPipe) imageId: string,
    @Body() dto: { imageType?: string; altText?: string },
  ) {
    return this.mediaService.updateImageMetadata(imageId, dto);
  }
}
