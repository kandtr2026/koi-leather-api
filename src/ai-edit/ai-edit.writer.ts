import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { bocLai } from "./ai-edit.json-vi";
import { LoaiNoiDung, TRUONG_CHO_PHEP } from "./ai-edit.types";

/**
 * Trường KHÔNG ĐƯỢC để trống. Cột NOT NULL trong DB, và cũng là thứ khách nhìn
 * thấy đầu tiên: AI trả về chuỗi rỗng cho `title` là bài viết mất tiêu đề, trang
 * hiện một dòng trắng, thẻ <title> rỗng trên Google. Chặn ở đây thay vì để
 * Postgres ném lỗi ràng buộc, để thông báo còn đọc được.
 */
const KHONG_DUOC_RONG = new Set(["title", "name"]);

/**
 * Client của transaction. `ghi()` BẮT BUỘC nhận tham số này — xem doc của hàm.
 */
export type ClientGhi = Prisma.TransactionClient;

export interface MotThayDoi {
  truong: string;
  /** Chữ chủ shop đã thấy ở bước xem trước. Dùng để phát hiện dữ liệu đã đổi. */
  truoc: string | null;
  sau: string | null;
}

@Injectable()
export class AiEditWriter {
  constructor(private prisma: PrismaService) {}

  /**
   * Đọc bản ghi hiện tại, chỉ những cột được phép sửa.
   *
   * Đọc lại ngay trước khi ghi, không dùng lại dữ liệu của bước xem trước: giữa
   * hai bước có thể đã có người sửa tay trong admin, hoặc chủ shop mở hai tab.
   */
  async docHienTai(
    kind: LoaiNoiDung,
    id: string,
  ): Promise<Record<string, string | null>> {
    const cot = TRUONG_CHO_PHEP[kind].map((t) => t.ten);
    const chon = Object.fromEntries(cot.map((c) => [c, true]));

    let row: Record<string, unknown> | null = null;
    switch (kind) {
      case "post":
        row = await this.prisma.posts.findUnique({
          where: { id: BigInt(id) },
          select: chon as never,
        });
        break;
      case "page":
        row = await this.prisma.pages.findUnique({
          where: { id: BigInt(id) },
          select: chon as never,
        });
        break;
      case "product":
        row = await this.prisma.koiProduct.findUnique({
          where: { id },
          select: chon as never,
        });
        break;
      case "category":
        row = await this.prisma.koiCategory.findUnique({
          where: { id },
          select: chon as never,
        });
        break;
      case "product_tag":
        row = await this.prisma.tags.findUnique({
          where: { id: BigInt(id) },
          select: chon as never,
        });
        break;
      case "blog_term":
        row = await this.prisma.post_terms.findUnique({
          where: { id: BigInt(id) },
          select: chon as never,
        });
        break;
    }

    if (!row) {
      throw new BadRequestException(
        `Bản ghi ${kind}/${id} không còn tồn tại. Có thể đã bị xoá sau lúc xem trước.`,
      );
    }

    return Object.fromEntries(
      cot.map((c) => [c, row![c] == null ? null : String(row![c])]),
    );
  }

  /**
   * Ghi các trường đã được duyệt. Chỉ nhận tên cột nằm trong allowlist — tên lạ
   * thì NÉM LỖI chứ không lặng lẽ bỏ qua, vì "bấm xong thấy báo thành công mà
   * chữ không đổi" là kiểu lỗi khó lần ra nhất.
   *
   * Giá trị vào đây là chữ ĐÃ BÓC vỏ JSON; hàm này tự bọc lại theo hình cũ đọc
   * từ DB. Nên bên gọi không phải biết bảng nào lưu JSON, bảng nào lưu chữ trần.
   *
   * VÌ SAO `tx` LÀ THAM SỐ ĐẦU TIÊN VÀ BẮT BUỘC:
   * Bản đầu của hàm này dùng `this.prisma` — client gốc. Hệ quả: gọi nó bên trong
   * một $transaction thì câu UPDATE vẫn đi RA NGOÀI transaction đó, nên khi
   * transaction cuộn lại, phần ghi KHÔNG cuộn theo. Tôi đã mắc đúng lỗi này lúc
   * diễn thử và ghi đè thật 5 trường trên 2 bản ghi production (đã phục hồi từng
   * byte). Bắt buộc truyền `tx` để trình biên dịch không cho phép gọi sai nữa:
   * ghi và chụp bản gốc vào KoiContentRevision phải cùng sống cùng chết.
   */
  async ghi(
    tx: ClientGhi,
    kind: LoaiNoiDung,
    id: string,
    hienTai: Record<string, string | null>,
    thayDoi: MotThayDoi[],
  ): Promise<void> {
    const chophep = new Set(TRUONG_CHO_PHEP[kind].map((t) => t.ten));
    const data: Record<string, string | null> = {};

    for (const td of thayDoi) {
      if (!chophep.has(td.truong)) {
        throw new BadRequestException(
          `Trường "${td.truong}" không được phép sửa cho loại ${kind}.`,
        );
      }
      const sach = td.sau == null ? null : td.sau;
      if (KHONG_DUOC_RONG.has(td.truong) && !sach?.trim()) {
        throw new BadRequestException(
          `Trường "${td.truong}" không được để trống.`,
        );
      }
      data[td.truong] = bocLai(hienTai[td.truong], sach);
    }

    if (!Object.keys(data).length) return;

    // MỌI câu ghi đi qua `tx`, không phải `this.prisma`. Xem doc phía trên.
    switch (kind) {
      case "post":
        await tx.posts.update({
          where: { id: BigInt(id) },
          data: data as never,
        });
        return;
      case "page":
        await tx.pages.update({
          where: { id: BigInt(id) },
          data: data as never,
        });
        return;
      case "product":
        await tx.koiProduct.update({
          where: { id },
          data: data as never,
        });
        return;
      case "category":
        await tx.koiCategory.update({
          where: { id },
          data: data as never,
        });
        return;
      case "product_tag":
        await tx.tags.update({
          where: { id: BigInt(id) },
          data: data as never,
        });
        return;
      case "blog_term":
        await tx.post_terms.update({
          where: { id: BigInt(id) },
          data: data as never,
        });
        return;
    }
  }
}
