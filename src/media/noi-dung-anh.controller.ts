import {
  Controller,
  Post,
  Body,
  BadRequestException,
  ServiceUnavailableException,
  UseInterceptors,
  UploadedFile,
  Logger,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiTags, ApiOperation, ApiBody, ApiConsumes } from "@nestjs/swagger";
import { randomBytes } from "crypto";
import {
  isSupabaseStorageConfigured,
  uploadImageWithVariants,
} from "./supabase-storage";

/**
 * Tải ảnh cho NỘI DUNG (bài blog, trang dịch vụ) — không gắn vào sản phẩm nào.
 *
 * VÌ SAO CÓ ĐƯỜNG NÀY. Trước 27/09/2026 cách duy nhất đưa ảnh lên Supabase
 * Storage là POST /products/:id/images/upload — ảnh nào cũng phải thuộc một sản
 * phẩm. Ảnh hậu trường xưởng (bài blog) và ảnh các ca sửa đồ hiệu của khách
 * (trang /sua-chua-do-da/) không phải sản phẩm; nhét vào một "sản phẩm nháp"
 * cho có chỗ chứa thì thư viện ảnh và thống kê ảnh SP sẽ đếm sai.
 *
 * Cùng bucket `products`, cùng khuôn ảnh gốc ≤1600 + w400/w800/w1200 như ảnh sản
 * phẩm, để loader next/image của storefront tự chèn /w{N}/ y như ảnh SP. Chỉ
 * khác tiền tố khoá: `noi-dung/<thuMuc>/…`.
 *
 * Quyền: admin (JWT) hoặc token GHI admin của storefront — token đó chỉ được
 * đúng đường này (auth.guard.ts), không phải cả nhóm /media.
 */
@ApiTags("Media")
@Controller("media/noi-dung")
export class NoiDungAnhController {
  private readonly logger = new Logger(NoiDungAnhController.name);

  @Post("upload")
  @ApiOperation({ summary: "Tải ảnh nội dung (blog/trang) → WebP + bản nhỏ" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        thuMuc: {
          type: "string",
          description: "Thư mục con, dạng slug: chữ thường, số, gạch ngang",
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor("file"))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body("thuMuc") thuMuc?: string,
  ) {
    if (!file) throw new BadRequestException("Thiếu file");
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Chỉ nhận file ảnh");
    }
    // Khoá do người gọi đặt một phần → khoá chặt dạng slug, không cho "../" hay
    // dấu "/" lọt vào đường dẫn trong bucket.
    const tm = String(thuMuc ?? "").trim();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tm) || tm.length > 80) {
      throw new BadRequestException(
        "thuMuc phải là slug: chữ thường không dấu, số, gạch ngang",
      );
    }
    if (!isSupabaseStorageConfigured()) {
      throw new ServiceUnavailableException("Supabase Storage chưa cấu hình");
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharp = require("sharp");
    // rotate(): áp hướng EXIF — ảnh máy ảnh dựng dọc không bị nằm ngang.
    const goc = sharp(file.buffer, { failOn: "none" }).rotate();
    const meta = await goc.clone().metadata();
    const mk = (w: number, q: number) =>
      goc
        .clone()
        .resize(w, undefined, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: q })
        .toBuffer({ resolveWithObject: true });
    const [base, w400, w800, w1200] = await Promise.all([
      mk(1600, 82),
      mk(400, 80),
      mk(800, 80),
      mk(1200, 80),
    ]);

    const key = `noi-dung/${tm}/${Date.now()}-${randomBytes(3).toString("hex")}.webp`;
    const { url } = await uploadImageWithVariants({
      key,
      base: base.data,
      variants: [
        { width: 400, buf: w400.data },
        { width: 800, buf: w800.data },
        { width: 1200, buf: w1200.data },
      ],
    });
    this.logger.log(
      `Ảnh nội dung ${file.originalname} → ${key} (${meta.width}×${meta.height})`,
    );
    return { url, width: base.info.width, height: base.info.height };
  }
}
