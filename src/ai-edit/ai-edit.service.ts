import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AiEditResolver, KetQuaTra } from "./ai-edit.resolver";
import { AiEditWriter, MotThayDoi } from "./ai-edit.writer";
import { OpenAiClient } from "./openai.client";
import { goBoc } from "./ai-edit.json-vi";
import { LoaiNoiDung, TRUONG_CHO_PHEP } from "./ai-edit.types";

export interface KetQuaSinh {
  kind: LoaiNoiDung;
  id: string;
  path: string;
  tieuDe: string;
  model: string;
  soToken: number | null;
  canhBao: string[];
  /** Từng trường: chữ cũ và chữ AI đề nghị. Chưa ghi gì vào DB ở bước này. */
  thayDoi: Array<{
    truong: string;
    nhan: string;
    html?: boolean;
    truoc: string | null;
    sau: string | null;
    /** true = AI trả lại y nguyên, không có gì để áp dụng. */
    khongDoi: boolean;
    /** Cảnh báo riêng của trường, ví dụ vượt độ dài SEO nên nhắm. */
    luuY: string[];
  }>;
}

@Injectable()
export class AiEditService {
  private readonly log = new Logger(AiEditService.name);

  constructor(
    private prisma: PrismaService,
    private resolver: AiEditResolver,
    private writer: AiEditWriter,
    private gpt: OpenAiClient,
  ) {}

  tra(link: string): Promise<KetQuaTra> {
    return this.resolver.tra(link);
  }

  trangThai() {
    return {
      daCoKey: this.gpt.daCoKey(),
      model: this.gpt.modelDangDung(),
    };
  }

  /**
   * Lời dặn cho AI.
   *
   * Mỗi dòng ở đây là một lần đã nghĩ tới chuyện gì có thể hỏng:
   *
   *  · GIỮ THẺ HTML: thân bài và mô tả sản phẩm là HTML có <p>, <strong>, <a>.
   *    AI trả về chữ trần là trang mất hết định dạng, mà tệ hơn là mất các thẻ
   *    <a> trỏ nội bộ — đó là liên kết nội bộ đang đỡ SEO cho cả site.
   *  · KHÔNG BỊA SỐ: kích thước, chất liệu, giá, thời gian bảo hành. Đây là hàng
   *    thủ công bán thật; bịa "da bò Ý" cho món làm bằng da dê là nói sai với
   *    khách, và chủ shop chịu trách nhiệm chứ không phải cái máy.
   *  · GIỮ NGUYÊN URL: đổi một chữ trong href là link chết.
   *  · TRẢ ĐỦ KHOÁ: thiếu khoá thì bên dưới hiểu là "không đổi trường đó", nên
   *    dặn rõ trả lại y nguyên nếu không cần sửa, để phân biệt được hai ý.
   */
  private loiDan(kind: LoaiNoiDung, coHtml: boolean): string {
    const dong = [
      "Bạn là người biên tập nội dung cho một xưởng đồ da thủ công Việt Nam (KOI Leather).",
      "Nhiệm vụ: viết lại câu chữ theo đúng yêu cầu của chủ xưởng, giữ nguyên ý nghĩa và mọi thông tin thật.",
      "",
      "QUY TẮC BẮT BUỘC:",
      "1. Viết bằng tiếng Việt tự nhiên, có dấu đầy đủ.",
      "2. KHÔNG bịa thêm thông tin không có trong bản gốc: không thêm kích thước, chất liệu, giá, thời gian bảo hành, cam kết, con số hay tên riêng nào mới.",
      "3. Giữ nguyên mọi số liệu, tên chất liệu và tên riêng đã có trong bản gốc.",
      "4. Giữ nguyên chính xác mọi đường dẫn (href, src) — không sửa một ký tự nào trong URL.",
      "5. Trường nào bạn thấy đã ổn thì trả lại ĐÚNG NGUYÊN VĂN bản gốc, không được bỏ khoá đó.",
      "6. Không thêm lời bình, không thêm phần mở đầu hay kết thúc ngoài nội dung được yêu cầu.",
    ];
    if (coHtml) {
      dong.push(
        "7. Có trường là HTML. Giữ nguyên cấu trúc thẻ (<p>, <strong>, <ul>, <li>, <a>, <h2>…): chỉ thay chữ bên trong thẻ, không xoá thẻ, không thêm thẻ lạ, không trả về Markdown.",
      );
    }
    dong.push(
      "",
      `Trả về DUY NHẤT một đối tượng JSON, khoá là tên trường được yêu cầu, giá trị là chuỗi nội dung mới. Không kèm giải thích, không kèm khối mã.`,
    );
    return dong.join("\n");
  }

  private soTokenToiDa(): number {
    const n = Number(process.env.OPENAI_MAX_TOKENS || "");
    return Number.isFinite(n) && n > 0 ? n : 8000;
  }

  /**
   * Gọi AI và trả về bản đề nghị. KHÔNG ghi gì vào cơ sở dữ liệu.
   *
   * Tách hẳn khỏi bước ghi là quyết định có chủ ý: chủ shop phải đọc được chữ mới
   * đặt cạnh chữ cũ rồi mới quyết. Gộp hai bước thành một nút thì mỗi lần bấm là
   * một lần đánh cược lên nội dung đang có khách đọc.
   */
  async sinh(
    link: string,
    yeuCau: string,
    truongChon?: string[],
  ): Promise<KetQuaSinh> {
    const banGhi = await this.resolver.tra(link);
    const nhiemVu = (yeuCau || "").trim();
    if (!nhiemVu) {
      throw new BadRequestException("Chưa viết yêu cầu sửa gì.");
    }

    // Lọc theo trường chủ shop tick chọn. Không tick gì thì hiểu là mọi trường
    // ĐANG CÓ CHỮ — không gửi trường trống, vì "viết lại" một trường rỗng thực
    // chất là bịa mới, đúng thứ vừa dặn AI không được làm.
    const chophep = TRUONG_CHO_PHEP[banGhi.kind].map((t) => t.ten);
    const chon = truongChon?.length
      ? truongChon.filter((t) => chophep.includes(t))
      : null;
    if (truongChon?.length && !chon?.length) {
      throw new BadRequestException(
        `Không có trường nào hợp lệ trong danh sách đã chọn. Trường cho phép: ${chophep.join(", ")}.`,
      );
    }

    const canGui = banGhi.truong.filter((t) =>
      chon ? chon.includes(t.ten) : Boolean(t.giaTri?.trim()),
    );
    if (!canGui.length) {
      throw new BadRequestException(
        "Bản ghi này chưa có chữ nào trong các trường sửa được, hoặc bạn chưa chọn trường nào.",
      );
    }

    const coHtml = canGui.some((t) => t.html);
    const heThong = this.loiDan(banGhi.kind, coHtml);

    const moTaTruong = canGui
      .map((t) => {
        const gioiHan = t.soKyTuNen ? ` (nên dưới ${t.soKyTuNen} ký tự)` : "";
        const loai = t.html ? " [HTML]" : "";
        return `- ${t.ten}: ${t.nhan}${loai}${gioiHan}`;
      })
      .join("\n");

    const banGoc = Object.fromEntries(
      canGui.map((t) => [t.ten, t.giaTri ?? ""]),
    );

    const nguoiDung = [
      `Trang đang sửa: ${banGhi.path}`,
      `Loại nội dung: ${banGhi.kind}`,
      "",
      "YÊU CẦU CỦA CHỦ XƯỞNG:",
      nhiemVu,
      "",
      "CÁC TRƯỜNG CẦN TRẢ VỀ:",
      moTaTruong,
      "",
      "NỘI DUNG HIỆN TẠI (JSON):",
      JSON.stringify(banGoc, null, 2),
    ].join("\n");

    const { dulieu, model, soToken } = await this.gpt.sinhJson(
      heThong,
      nguoiDung,
      this.soTokenToiDa(),
    );

    if (
      typeof dulieu !== "object" ||
      dulieu === null ||
      Array.isArray(dulieu)
    ) {
      throw new BadRequestException(
        "AI trả về dữ liệu không đúng dạng đối tượng. Thử lại lượt nữa.",
      );
    }
    const ra = dulieu as Record<string, unknown>;

    const thayDoi = canGui.map((t) => {
      const v = ra[t.ten];
      const luuY: string[] = [];
      // Thiếu khoá = AI bỏ sót trường đó. Coi như không đổi, và nói ra để chủ
      // shop biết vì sao trường mình chọn lại không có đề nghị nào.
      let sau: string | null = null;
      if (v == null) {
        luuY.push("AI không trả về trường này.");
      } else if (typeof v !== "string") {
        luuY.push("AI trả về kiểu dữ liệu lạ cho trường này, đã bỏ qua.");
      } else {
        sau = v;
      }

      const truoc = t.giaTri;
      const khongDoi = sau == null || sau === (truoc ?? "");

      if (sau != null && t.soKyTuNen && sau.length > t.soKyTuNen) {
        luuY.push(
          `Dài ${sau.length} ký tự, vượt mức nên dùng ${t.soKyTuNen} — Google có thể cắt giữa câu.`,
        );
      }
      // Thân bài rút ngắn quá nhiều gần như luôn là AI bỏ mất đoạn, không phải
      // biên tập gọn. Cảnh báo theo tỉ lệ chứ không chặn: có lúc chủ shop muốn
      // rút thật, và người quyết là họ.
      if (sau != null && t.html && truoc && sau.length < truoc.length * 0.6) {
        luuY.push(
          `Ngắn hơn bản gốc ${Math.round((1 - sau.length / truoc.length) * 100)}% — đọc kỹ xem có bị mất đoạn.`,
        );
      }
      if (sau != null && t.html && truoc) {
        const demThe = (s: string) => (s.match(/<a\s/gi) || []).length;
        const cu = demThe(truoc);
        const moi = demThe(sau);
        if (moi < cu) {
          luuY.push(`Mất ${cu - moi} liên kết (<a>) so với bản gốc.`);
        }
      }

      return {
        truong: t.ten,
        nhan: t.nhan,
        html: t.html,
        truoc,
        sau,
        khongDoi,
        luuY,
      };
    });

    return {
      kind: banGhi.kind,
      id: banGhi.id,
      path: banGhi.path,
      tieuDe: banGhi.tieuDe,
      model,
      soToken,
      canhBao: banGhi.canhBao,
      thayDoi,
    };
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
