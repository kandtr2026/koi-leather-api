import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { sapAnhChinh, type CachChonAnhChinh } from "./anh-chinh";
import { generateImageAltText } from "../seo/seo-generator.helper";
import {
  isSupabaseProductUrl,
  keyFromPublicUrl,
  removeImageWithVariants,
} from "./supabase-storage";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class MediaService {
  private logger = new Logger(MediaService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Giữ bất biến "ảnh chính = tấm đứng đầu" cho một sản phẩm — xem anh-chinh.ts.
   * Mọi đường ghi ảnh (đặt bìa, sắp thứ tự, tải lên, xoá) đều gọi hàm này sau
   * khi ghi, trong CÙNG giao dịch.
   *
   * Ghi bằng MỘT câu UPDATE … FROM unnest chứ không mỗi tấm một câu: sản phẩm
   * 20 ảnh mà gọi 20 câu qua pooler thì dễ vượt 5 giây mặc định của giao dịch
   * Prisma (đã dính thật 26/09 khi chạy tools/chon-anh-chinh.mjs).
   */
  private async chotAnhChinh(
    db: Prisma.TransactionClient,
    productId: string,
    cach: CachChonAnhChinh,
  ): Promise<void> {
    const anh = await db.koiProductImage.findMany({
      where: { productId },
      select: {
        id: true,
        displayOrder: true,
        isPrimary: true,
        createdAt: true,
      },
    });
    const doi = sapAnhChinh(anh, cach);
    if (!doi.length) return;
    await db.$executeRaw`
      UPDATE koi_free_style.koi_product_images i
      SET "displayOrder" = m.thu_tu, "isPrimary" = m.chinh, "updatedAt" = now()
      FROM unnest(
        ${doi.map((d) => d.id)}::text[],
        ${doi.map((d) => d.displayOrder)}::int[],
        ${doi.map((d) => d.isPrimary)}::boolean[]
      ) AS m(id, thu_tu, chinh)
      WHERE i.id = m.id AND i."productId" = ${productId}
    `;
  }

  /**
   * Giao dịch ghi ảnh của MỘT sản phẩm, chạy lần lượt từng cái một.
   *
   * Khoá theo sản phẩm (pg_advisory_xact_lock, tự nhả khi giao dịch kết thúc)
   * trước mọi thứ: chotAnhChinh đọc rồi mới ghi, nên hai thao tác cùng lúc
   * trên một sản phẩm — bấm sao ở hai tấm liên tiếp trong SPA, hai tab cùng tải
   * ảnh — mà không khoá thì cả hai đọc cùng trạng thái cũ và có thể để lại HAI
   * tấm mang cờ cùng đứng vị trí 0. Khoá rồi thì cái sau đọc đúng kết quả cái
   * trước. Chỉ chặn các thao tác trên CÙNG sản phẩm, sản phẩm khác không chờ.
   *
   * Timeout 20 giây: mặc định Prisma 5 giây là hụt khi đi qua pooler.
   */
  private giaoDich<T>(
    productId: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${productId}))`;
        return fn(tx);
      },
      { timeout: 20_000, maxWait: 10_000 },
    );
  }

  async registerImage(
    productId: string,
    data: {
      cloudinaryPublicId?: string;
      cloudinaryUrl: string;
      thumbnailUrl: string;
      mediumUrl?: string;
      altText?: string;
      imageType?: string;
      isPrimary?: boolean;
      width?: number;
      height?: number;
      mimeType?: string;
      fileSize?: number;
    },
    variantId?: string,
  ) {
    const product = await this.prisma.koiProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");

    // Validate imageType against dynamic categories if provided
    if (data.imageType) {
      const cat = await this.prisma.koiImageCategory.findUnique({
        where: { code: data.imageType },
      });
      if (!cat) {
        const all = await this.prisma.koiImageCategory.findMany({
          orderBy: { sortOrder: "asc" },
        });
        const codes = all.map((c) => c.code).join(", ");
        throw new BadRequestException(
          `Invalid imageType. Must be one of: ${codes}`,
        );
      }
    }

    const nameObj = product.name as any;
    const productName = nameObj?.vi || nameObj?.en || "Koi Leather product";
    const finalAltText =
      data.altText ||
      generateImageAltText(productName, data.imageType || "STUDIO");

    // Tạo xong mới chốt ảnh chính, cùng giao dịch. Tick "ảnh chính" thì tấm
    // mới lên ĐẦU (bản cũ để nó nằm cuối mà mang cờ — thẻ một ảnh, trang chi
    // tiết một ảnh). Không tick thì giữ bìa cũ; sản phẩm chưa có ảnh nào thì
    // tấm này tự thành bìa.
    return this.giaoDich(productId, async (tx) => {
      // Tính vị trí cuối TRONG giao dịch đã khoá: hai lượt tải cùng lúc mà tính
      // ngoài khoá thì cùng ra một số, hai tấm trùng vị trí.
      const lastImage = await tx.koiProductImage.findFirst({
        where: { productId },
        orderBy: { displayOrder: "desc" },
      });
      const displayOrder = lastImage ? lastImage.displayOrder + 1 : 0;
      const moi = await tx.koiProductImage.create({
        data: {
          productId,
          variantId: variantId || null,
          url: data.cloudinaryUrl,
          thumbnailUrl: data.thumbnailUrl,
          mediumUrl: data.mediumUrl || data.cloudinaryUrl,
          altText: finalAltText,
          imageType: data.imageType || "STUDIO",
          isPrimary: false,
          displayOrder,
          mimeType: data.mimeType || "image/webp",
          fileSize: data.fileSize || null,
          width: data.width || null,
          height: data.height || null,
        },
      });
      await this.chotAnhChinh(
        tx,
        productId,
        data.isPrimary ? { chon: moi.id } : { uuTien: "co-san" },
      );
      return tx.koiProductImage.findUniqueOrThrow({ where: { id: moi.id } });
    });
  }

  /**
   * Thay FILE của một ảnh đã có, GIỮ NGUYÊN vị trí (displayOrder), cờ primary,
   * variant và imageType. Chỉ đổi url/thumbnail/medium + kích thước/định dạng.
   * Ảnh cũ trên Cloudinary được xoá sau khi cập nhật thành công (nếu không còn
   * record nào khác tham chiếu — theo đúng logic deleteImage).
   */
  async replaceImageFile(
    productId: string,
    imageId: string,
    data: {
      cloudinaryUrl: string;
      thumbnailUrl: string;
      mediumUrl?: string;
      width?: number;
      height?: number;
      mimeType?: string;
      fileSize?: number;
    },
  ) {
    const existing = await this.prisma.koiProductImage.findUnique({
      where: { id: imageId },
    });
    if (!existing || existing.productId !== productId) {
      throw new NotFoundException("Image not found for this product");
    }

    const oldUrls = {
      url: existing.url,
      thumbnailUrl: existing.thumbnailUrl,
      mediumUrl: existing.mediumUrl,
    };

    const updated = await this.prisma.koiProductImage.update({
      where: { id: imageId },
      data: {
        url: data.cloudinaryUrl,
        thumbnailUrl: data.thumbnailUrl,
        mediumUrl: data.mediumUrl || data.cloudinaryUrl,
        mimeType: data.mimeType || "image/webp",
        fileSize: data.fileSize ?? existing.fileSize,
        width: data.width ?? existing.width,
        height: data.height ?? existing.height,
        // displayOrder, isPrimary, variantId, imageType, altText giữ nguyên.
      },
    });

    // Dọn file cũ nếu URL đổi và không còn record nào khác dùng chung.
    if (oldUrls.url && oldUrls.url !== data.cloudinaryUrl) {
      const otherRefs = await this.prisma.koiProductImage.count({
        where: {
          id: { not: imageId },
          OR: [
            { url: oldUrls.url },
            { thumbnailUrl: oldUrls.thumbnailUrl },
            { mediumUrl: oldUrls.mediumUrl },
          ],
        },
      });
      if (otherRefs === 0) {
        await this.deletePhysicalFile({
          url: oldUrls.url,
          thumbnailUrl: oldUrls.thumbnailUrl,
          mediumUrl: oldUrls.mediumUrl,
        });
      } else {
        this.logger.warn(
          `Old image URL "${oldUrls.url}" referenced by ${otherRefs} other record(s). Skipping physical delete.`,
        );
      }
    }

    return updated;
  }

  async getProductImages(productId: string) {
    return this.prisma.koiProductImage.findMany({
      where: { productId },
      orderBy: { displayOrder: "asc" },
    });
  }

  async deleteImage(imageId: string) {
    const image = await this.prisma.koiProductImage.findUnique({
      where: { id: imageId },
    });
    if (!image) throw new NotFoundException("Image not found");

    // Ghi DB TRƯỚC, xoá file SAU. Xoá file là bước không lùi được: làm trước
    // mà giao dịch hỏng thì dòng ảnh còn nguyên nhưng file đã mất — mặt tiền
    // hiện ảnh vỡ, có khi đúng ảnh bìa. Làm sau thì cùng lắm sót một file mồ
    // côi trong kho, không ai thấy.
    //
    // Xoá xong chốt lại ảnh chính: xoá đúng tấm bìa thì tấm kế tiếp thành bìa,
    // thứ tự liền lại từ 0 — không để sản phẩm rơi vào cảnh không có ảnh chính.
    await this.giaoDich(image.productId, async (tx) => {
      await tx.koiProductImage.delete({ where: { id: imageId } });
      await this.chotAnhChinh(tx, image.productId, { uuTien: "co-san" });
    });

    // Kiểm tra xem URL ảnh có đang được tham chiếu bởi sản phẩm khác không
    // (dòng vừa xoá đã không còn, nên không cần loại trừ nó nữa).
    const otherRefs = await this.prisma.koiProductImage.count({
      where: {
        OR: [
          { url: image.url },
          { thumbnailUrl: image.thumbnailUrl },
          { mediumUrl: image.mediumUrl },
        ],
      },
    });

    if (otherRefs === 0) {
      // Không có tham chiếu nào khác → an toàn để xóa file vật lý
      await this.deletePhysicalFile(image);
    } else {
      this.logger.warn(
        `Image URL "${image.url}" is referenced by ${otherRefs} other record(s). Skipping physical file deletion.`,
      );
    }

    return {
      deleted: true,
      cloudinaryPublicId: image.url.split("/").pop()?.split(".")[0],
    };
  }

  private async deletePhysicalFile(image: {
    url: string;
    thumbnailUrl: string;
    mediumUrl: string | null;
  }) {
    // Supabase Storage: xoá ảnh gốc + w400/w800/w1200 theo key.
    if (isSupabaseProductUrl(image.url)) {
      const key = keyFromPublicUrl(image.url);
      if (key) {
        try {
          await removeImageWithVariants(key);
        } catch (err) {
          this.logger.warn(
            `Xoá ảnh Supabase thất bại (${key}): ${(err as Error).message}`,
          );
        }
        return;
      }
    }
    // Đường lui: file local (dev).
    this.deleteLocalFile(image.url);
    this.deleteLocalFile(image.thumbnailUrl);
    if (image.mediumUrl) this.deleteLocalFile(image.mediumUrl);
  }

  private deleteLocalFile(url: string) {
    if (!url.startsWith("/uploads/")) return;
    const filePath = path.join(process.cwd(), url);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      this.logger.warn(
        `Failed to delete local file ${url}: ${(err as Error).message}`,
      );
    }
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.koiProductImage.findUnique({
      where: { id: imageId },
    });
    if (!image || image.productId !== productId) {
      throw new NotFoundException("Image not found for this product");
    }

    // "Đặt bìa" = tấm này lên ĐẦU và mang cờ. Bản cũ chỉ đổi cờ: thẻ sản phẩm
    // đổi ảnh nhưng trang chi tiết (xếp theo displayOrder) vẫn mở bằng tấm cũ.
    return this.giaoDich(productId, async (tx) => {
      await this.chotAnhChinh(tx, productId, { chon: imageId });
      return tx.koiProductImage.findUniqueOrThrow({ where: { id: imageId } });
    });
  }

  async reorderImages(
    productId: string,
    items: { id: string; displayOrder: number }[],
  ) {
    // Sắp xong thì tấm đứng đầu thành bìa — đúng thứ người sắp nhìn thấy: tấm
    // đầu là tấm mở trang chi tiết, nên thẻ sản phẩm cũng phải là tấm đó.
    const hopLe = items.filter(
      (it) =>
        it && typeof it.id === "string" && Number.isInteger(it.displayOrder),
    );
    await this.giaoDich(productId, async (tx) => {
      if (hopLe.length) {
        await tx.$executeRaw`
          UPDATE koi_free_style.koi_product_images i
          SET "displayOrder" = m.thu_tu, "updatedAt" = now()
          FROM unnest(
            ${hopLe.map((it) => it.id)}::text[],
            ${hopLe.map((it) => it.displayOrder)}::int[]
          ) AS m(id, thu_tu)
          WHERE i.id = m.id AND i."productId" = ${productId}
        `;
      }
      await this.chotAnhChinh(tx, productId, { uuTien: "dau" });
    });
    return this.getProductImages(productId);
  }

  async updateImageType(
    imageId: string,
    imageType: string,
    autoGenerateAlt = true,
  ) {
    const cat = await this.prisma.koiImageCategory.findUnique({
      where: { code: imageType },
    });
    if (!cat) {
      const all = await this.prisma.koiImageCategory.findMany({
        orderBy: { sortOrder: "asc" },
      });
      const codes = all.map((c) => c.code).join(", ");
      throw new BadRequestException(`imageType must be one of: ${codes}`);
    }
    const existing = await this.prisma.koiProductImage.findUnique({
      where: { id: imageId },
      include: { product: { select: { name: true, slug: true } } },
    });
    if (!existing) throw new NotFoundException("Image not found");

    const data: any = { imageType };
    if (autoGenerateAlt) {
      const nameObj = existing.product.name as any;
      const productName = nameObj?.vi || nameObj?.en || "Koi Leather product";
      data.altText = generateImageAltText(productName, imageType);
    }
    return this.prisma.koiProductImage.update({ where: { id: imageId }, data });
  }

  async updateImageMetadata(
    imageId: string,
    dto: { imageType?: string; altText?: string },
  ) {
    const existing = await this.prisma.koiProductImage.findUnique({
      where: { id: imageId },
    });
    if (!existing) throw new NotFoundException("Image not found");

    const data: any = {};
    if (dto.imageType) {
      const cat = await this.prisma.koiImageCategory.findUnique({
        where: { code: dto.imageType },
      });
      if (!cat) {
        const all = await this.prisma.koiImageCategory.findMany({
          orderBy: { sortOrder: "asc" },
        });
        const codes = all.map((c) => c.code).join(", ");
        throw new BadRequestException(`imageType must be one of: ${codes}`);
      }
      data.imageType = dto.imageType;
    }
    if (dto.altText !== undefined) data.altText = dto.altText;

    return this.prisma.koiProductImage.update({ where: { id: imageId }, data });
  }

  async bulkUpdateImageMetadata(
    productId: string,
    items: { id: string; imageType?: string; altText?: string }[],
  ) {
    const results: any[] = [];
    for (const item of items) {
      const updated = await this.updateImageMetadata(item.id, {
        imageType: item.imageType,
        altText: item.altText,
      });
      results.push(updated);
    }
    return results;
  }
}
