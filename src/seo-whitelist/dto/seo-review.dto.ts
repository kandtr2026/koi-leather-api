import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from "class-validator";

/**
 * Body cho nút "Chạy review ngay" (whitelist SEO) và cron review.
 *
 * `ids` TUỴ CHỌN: danh sách KoiKeywordWhitelist.id muốn ép review lại. Không
 * truyền (body rỗng) thì Koi tự chọn diện review từ snapshot metric hằng ngày.
 *
 * Chỉ nhận ĐÚNG field `ids` — mọi field lạ bị ValidationPipe whitelist cắt bỏ.
 * IsUUID("4") cùng khuôn với KoiKeywordWhitelist.id (`@default(uuid())`), riêng
 * mảng rỗng được phép: với body {} thì `ids` là undefined, đây là "chạy diện
 * mặc định" — để service tự xử lý thay vì chặn 400.
 */
export class SeoReviewDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID("4", { each: true })
  ids?: string[];
}