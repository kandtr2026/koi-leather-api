import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AiEditResolver, KetQuaTra } from "./ai-edit.resolver";
import { AiEditWriter, MotThayDoi } from "./ai-edit.writer";
import { goBoc } from "./ai-edit.json-vi";
import { LoaiNoiDung } from "./ai-edit.types";

@Injectable()
export class AiEditService {
  private readonly log = new Logger(AiEditService.name);

  constructor(
    private prisma: PrismaService,
    private resolver: AiEditResolver,
    private writer: AiEditWriter,
  ) {}

  tra(link: string): Promise<KetQuaTra> {
    return this.resolver.tra(link);
  }

  /**
   * Ghi những trường chủ shop đã duyệt, và chụp bản gốc vào KoiContentRevision.
   *
   * Ghi và chụp nằm trong CÙNG MỘT transaction. Nếu chụp lỗi mà ghi vẫn xong thì
   * nội dung đã bị thay mà không còn đường hoàn tác — đúng cái tình huống bảng
   * kia được dựng ra để tránh.
   */
  async apDung(input: {
    kind: LoaiNoiDung;
    id: string;
    path?: string | null;
    prompt?: string | null;
    model?: string | null;
    actor?: string | null;
    thayDoi: MotThayDoi[];
  }): Promise<{ batch: string; soTruong: number; boQua: string[] }> {
    const { kind, id } = input;
    if (!input.thayDoi?.length) {
      throw new BadRequestException("Chưa chọn trường nào để áp dụng.");
    }

    // Đọc lại từ DB ngay lúc này. Bước xem trước có thể đã cách đây vài phút.
    const hienTai = await this.writer.docHienTai(kind, id);

    const boQua: string[] = [];
    const nhan: MotThayDoi[] = [];

    for (const td of input.thayDoi) {
      // So với chữ chủ shop ĐÃ THẤY lúc xem trước, sau khi bóc vỏ JSON hai bên
      // cho cùng hệ quy chiếu. Lệch = có người khác vừa sửa trường này. Ghi đè
      // là xoá mất công của họ mà không ai hay, nên bỏ qua và báo lại.
      const dangCoSach = goBoc(hienTai[td.truong]);
      const mongDoi = td.truoc == null ? null : td.truoc;
      if ((dangCoSach ?? "") !== (mongDoi ?? "")) {
        boQua.push(
          `${td.truong}: nội dung trong cơ sở dữ liệu đã đổi sau lúc xem trước, không ghi đè.`,
        );
        continue;
      }
      if ((td.sau ?? "") === (mongDoi ?? "")) {
        boQua.push(`${td.truong}: chữ mới giống chữ cũ, không cần ghi.`);
        continue;
      }
      nhan.push(td);
    }

    if (!nhan.length) {
      throw new BadRequestException(
        `Không có gì để ghi. ${boQua.join(" ")}`.trim(),
      );
    }

    const batch = randomUUID();

    await this.prisma.$transaction(async (tx) => {
      // Chụp TRƯỚC khi ghi. Thứ tự này quan trọng: transaction có cuộn lại thì
      // cả hai cùng mất, nhưng nếu vì lý do nào đó chỉ một nửa đi qua, thà có
      // bản chụp mà chưa ghi (vô hại) hơn là ghi rồi mà không có bản chụp.
      await tx.koiContentRevision.createMany({
        data: nhan.map((td) => ({
          batch,
          kind,
          recordId: id,
          path: input.path ?? null,
          field: td.truong,
          // Lưu chữ ĐÃ BÓC vỏ, cùng dạng với thứ hiện trên admin, để lúc hoàn
          // tác và lúc đọc lịch sử không phải đoán dòng nào có vỏ dòng nào không.
          before: td.truoc,
          after: td.sau,
          prompt: input.prompt ?? null,
          model: input.model ?? null,
          actor: input.actor ?? null,
        })),
      });

      // Đúng MỘT đường ghi trong cả module: AiEditWriter.ghi(). Nó đòi `tx` ngay
      // ở chữ ký nên không thể gọi ngoài transaction.
      await this.writer.ghi(tx, kind, id, hienTai, nhan);
    });

    this.log.log(
      `AI sửa ${kind}/${id} (${input.path ?? "-"}): ${nhan.map((t) => t.truong).join(", ")} — batch ${batch} — bởi ${input.actor ?? "?"}`,
    );

    return { batch, soTruong: nhan.length, boQua };
  }

  /**
   * Hoàn tác trọn một nhóm: trả mọi trường trong batch về chữ `before`.
   *
   * Trả cả nhóm chứ không lẻ từng trường vì các trường của một lần sửa thường
   * ăn khớp nhau (tiêu đề mới đi với thẻ SEO mới); trả nửa vời là bản ghi thành
   * không nhất quán.
   */
  async hoanTac(
    batch: string,
    actor?: string | null,
    buoc = false,
  ): Promise<{ soTruong: number; boQua: string[] }> {
    const dong = await this.prisma.koiContentRevision.findMany({
      where: { batch },
      orderBy: { createdAt: "asc" },
    });
    if (!dong.length) {
      throw new BadRequestException(`Không có lần sửa nào với mã ${batch}.`);
    }
    if (dong.every((d) => d.revertedAt)) {
      throw new BadRequestException("Nhóm này đã được hoàn tác trước đó.");
    }

    const kind = dong[0].kind as LoaiNoiDung;
    const id = dong[0].recordId;
    const hienTai = await this.writer.docHienTai(kind, id);

    const boQua: string[] = [];
    const traLai: MotThayDoi[] = [];

    for (const d of dong) {
      if (d.revertedAt) {
        boQua.push(`${d.field}: đã hoàn tác trước đó.`);
        continue;
      }
      const dangCo = goBoc(hienTai[d.field]);
      // Nếu chữ hiện tại không còn là chữ AI đã ghi, tức sau đó có người sửa
      // tay. Hoàn tác lúc đó là xoá bản sửa tay của họ. Mặc định không làm; chủ
      // shop muốn thì bấm lại với buoc = true.
      if (!buoc && (dangCo ?? "") !== (d.after ?? "")) {
        boQua.push(
          `${d.field}: đã có người sửa tay sau lần AI ghi, không tự ý trả về. Chọn "hoàn tác cưỡng chế" nếu vẫn muốn.`,
        );
        continue;
      }
      traLai.push({ truong: d.field, truoc: dangCo, sau: d.before });
    }

    if (!traLai.length) {
      throw new BadRequestException(
        `Không hoàn tác được trường nào. ${boQua.join(" ")}`.trim(),
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.writer.ghi(tx, kind, id, hienTai, traLai);
      await tx.koiContentRevision.updateMany({
        where: { batch, field: { in: traLai.map((t) => t.truong) } },
        data: { revertedAt: new Date() },
      });
    });

    this.log.log(
      `Hoan tac ${kind}/${id} batch ${batch}: ${traLai.map((t) => t.truong).join(", ")} — boi ${actor ?? "?"}`,
    );

    return { soTruong: traLai.length, boQua };
  }

  /** Lịch sử sửa, gom theo batch, mới nhất trước. Cho danh sách ở admin. */
  async lichSu(gioiHan = 30) {
    const dong = await this.prisma.koiContentRevision.findMany({
      orderBy: { createdAt: "desc" },
      take: Math.min(Math.max(gioiHan, 1), 200) * 5,
    });

    const nhom = new Map<
      string,
      {
        batch: string;
        kind: string;
        recordId: string;
        path: string | null;
        prompt: string | null;
        model: string | null;
        actor: string | null;
        createdAt: Date;
        daHoanTac: boolean;
        truong: Array<{
          field: string;
          before: string | null;
          after: string | null;
        }>;
      }
    >();

    for (const d of dong) {
      let n = nhom.get(d.batch);
      if (!n) {
        n = {
          batch: d.batch,
          kind: d.kind,
          recordId: d.recordId,
          path: d.path,
          prompt: d.prompt,
          model: d.model,
          actor: d.actor,
          createdAt: d.createdAt,
          daHoanTac: true,
          truong: [],
        };
        nhom.set(d.batch, n);
      }
      if (!d.revertedAt) n.daHoanTac = false;
      // Cắt bớt chữ: một thân bài dài vài nghìn ký tự nhân với 30 nhóm là phản
      // hồi nặng vô ích, mà danh sách chỉ cần xem thoáng. Xem đủ thì mở riêng.
      n.truong.push({
        field: d.field,
        before: d.before == null ? null : d.before.slice(0, 300),
        after: d.after == null ? null : d.after.slice(0, 300),
      });
    }

    return [...nhom.values()].slice(0, gioiHan);
  }
}
