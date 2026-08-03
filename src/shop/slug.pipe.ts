import { Injectable, NotFoundException, PipeTransform } from "@nestjs/common";

/**
 * Rửa slug lấy từ đường dẫn trước khi đưa xuống Prisma.
 *
 * Byte NUL làm Postgres từ chối truy vấn → HTTP 500. Đo thật trên production:
 * `/shop/categories/%00`, `/shop/products/%00` và `/shop/content/%00` đều trả
 * 500 (cùng họ với `?material=%00`, nhưng slug là tham số ĐƯỜNG DẪN nên không
 * đi qua dieuKienLoc). Một địa chỉ vô nghĩa phải là 404 — 404 nói "không có
 * trang này", 500 nói "máy chủ của tôi hỏng", và Google đối xử hai câu đó rất
 * khác nhau.
 *
 * Cắt 200 ký tự: slug dài nhất trong cơ sở dữ liệu chưa tới 60 ký tự.
 */
@Injectable()
export class SlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    const sach = (value ?? "").replace(/\0/g, "").trim().slice(0, 200);
    if (!sach) throw new NotFoundException("Không tìm thấy");
    return sach;
  }
}
