import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdsService } from "../ads/ads.service";
import { OpenAiClient } from "../ai-edit/openai.client";

// Lệch múi giờ VN (UTC+7, Việt Nam không có DST nên số này là hằng số).
const LE_VN_MS = 7 * 60 * 60 * 1000;
const NGAY_MS = 24 * 60 * 60 * 1000;
// Cùng khuôn UUID với KoiKeywordWhitelist.id (kiểm bằng tay ở service, tầng DTO
// đã lo ở biên nhưng service vẫn tự phòng khi ai đó gọi thẳng qua cron/curl).
const KHUON_UUID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
// Một lượt cron/request chỉ chạy tối đa 5 lô GPT (5 × 50 = 250 từ) — mỗi lô
// mất vài giây, 5 lô là vừa với 300 giây maxDuration còn dư cho khởi động lạnh.
// Số từ còn lại để lượt sau (lịch lại 7 ngày đảm bảo không bỏ sót).
const TOI_DA_LO = 5;
const TOI_DA_TOKEN = 8000;

const HE_THONG = `Bạn là chuyên gia SEO cho cửa hàng đồ da thủ công koileather.com (Koi Leather).
Cửa hàng bán đồ da handmade: ví da, bóp da, thắt lưng da, cặp/túi da, ốp lưng da và phụ
kiện da thật. Khách người Việt, chốt đơn qua Zalo (không bán online tự động).

Nhiệm vụ: với mỗi từ khoá quảng cáo Google đang chạy, đánh giá từ đó có ĐÁNG đưa vào
whitelist SEO hay không. "Whitelist" nghĩa là đáng để tạo nội dung SEO (bài viết, trang
đích, meta title/description) nhắm đúng ý định tìm kiếm đó, kéo lượt tự nhiên thay vì
phải trả tiền quảng cáo.

Tiêu chí: (1) liên quan tới đồ da thật shop bán được; (2) ý định thương mại (muốn MUA,
không chỉ tìm hiểu); (3) từ cụ thể, rõ, không quá chung chung/sai chính tả nặng;
(4) có bằng chứng nhu cầu từ số liệu quảng cáo kèm theo.

Trả về DUY NHẤT một JSON đúng khuôn:
{"danhGia":[{"tuKhoa":"...","quyetDinh":"whitelist"|"reject","lyDo":"một câu tiếng Việt ngắn gọn","diem":0-100}]}
- "quyetDinh" CHỈ nhận "whitelist" hoặc "reject".
- "diem" là số nguyên 0-100 (càng cao càng đáng đưa vào SEO).
- Đánh giá ĐÚNG số từ nhận được, giữ nguyên chữ gốc của tuKhoa, không thêm bớt.`;

@Injectable()
export class SeoWhitelistService {
  private readonly log = new Logger(SeoWhitelistService.name);

  constructor(
    private prisma: PrismaService,
    private ads: AdsService,
    private openai: OpenAiClient,
  ) {}

  /** Đọc số nguyên dương từ env, trả mặc định khi thiếu/sai. */
  private soEnv(ten: string, macDinh: number): number {
    const n = Number(process.env[ten] || "");
    if (!Number.isFinite(n) || n <= 0) return macDinh;
    return n;
  }

  /** Cửa sổ ngày snapshot dùng để chọn diện review (mặc định 14). */
  private soNgayReview(): number {
    return this.soEnv("WHITELIST_REVIEW_SO_NGAY", 14);
  }

  /** Khoảng tối thiểu giữa 2 lần review cùng một từ khoá (mặc định 7). */
  private lichLaiNgay(): number {
    return this.soEnv("WHITELIST_REVIEW_LICH_LAI_NGAY", 7);
  }

  /** Số từ khoá mỗi lần gọi GPT, kẹp trong 20-50 (mặc định 50). */
  private batch(): number {
    const n = this.soEnv("WHITELIST_REVIEW_BATCH", 50);
    return Math.min(Math.max(Math.trunc(n), 20), 50);
  }

  /** Mốc "hôm nay 00:00 giờ VN" — dùng làm ngày snapshot và đếm khoảng cách. */
  private homNayVn(): Date {
    const gio = Date.now() + LE_VN_MS;
    const batDau = new Date(gio);
    batDau.setUTCHours(0, 0, 0, 0);
    return new Date(batDau.getTime() - LE_VN_MS);
  }

  private truNgay(soNgay: number): Date {
    return new Date(this.homNayVn().getTime() - soNgay * NGAY_MS);
  }

  /**
   * Danh sách whitelist hiện tại, mỗi dòng kèm `metricGanNhat` (snapshot mới
   * nhất của từ khoá đó) để panel hiện "Chi phí 30 ngày" không phải gọi thêm.
   */
  async layWhitelist(trangThai?: string) {
    const ds = await this.prisma.koiKeywordWhitelist.findMany({
      where: trangThai ? { trangThai } : {},
      orderBy: { ngayReview: "desc" },
    });
    if (!ds.length) return [];
    const mo = new Map<string, {
      ngay: Date;
      hienThi: number;
      cuBam: number;
      chiPhi: number;
      ctr: number | null;
      cpcTrungBinh: number | null;
      cuChuyenDoi: number | null;
    }>();
    const cac = await this.prisma.koiKeywordMetric.findMany({
      where: { tuKhoa: { in: Array.from(new Set(ds.map((k) => k.tuKhoa))) } },
      select: { tuKhoa: true, ngay: true, hienThi: true, cuBam: true, chiPhi: true, ctr: true, cpcTrungBinh: true, cuChuyenDoi: true },
      orderBy: { ngay: "desc" },
    });
    for (const m of cac) if (!mo.has(m.tuKhoa)) mo.set(m.tuKhoa, m);
    return ds.map((k) => ({ ...k, metricGanNhat: mo.get(k.tuKhoa) ?? null }));
  }

  /** Snapshot metric gần đây (debug), `days` kẹp 1..90. */
  async layMetrics(days?: number): Promise<unknown[]> {
    const so = Math.min(Math.max(Math.trunc(days ?? 7), 1), 90);
    return this.prisma.koiKeywordMetric.findMany({
      where: { ngay: { gte: this.truNgay(so) } },
      orderBy: { ngay: "desc" },
      take: 2000,
    });
  }

  /**
   * Cron snapshot hằng ngày: kéo toàn bộ từ khoá live (rolling 30 ngày) từ
   * Google Ads rồi upsert một dòng KoiKeywordMetric cho hôm nay.
   */
  async snapshot(): Promise<{ ok: boolean; daGhi?: number; loi?: string; thieuBien?: string[] }> {
    const kq = await this.ads.tuKhoaThat();
    if (!kq.daNoi) {
      return { ok: false, loi: "Chưa nối Google Ads", thieuBien: kq.thieuBien };
    }
    const ngay = this.homNayVn();
    let daGhi = 0;
    for (const k of kq.dsTuKhoa) {
      // chienDich phải là '' chứ không phải null: Postgres coi nhiều NULL là
      // khác nhau nên @@unique([tuKhoa, chienDich, ngay]) với null bị phá,
      // sinh dòng trùng mỗi ngày.
      const chienDich = k.chienDich || "";
      await this.prisma.koiKeywordMetric.upsert({
        where: { tuKhoa_chienDich_ngay: { tuKhoa: k.tuKhoa, chienDich, ngay } },
        create: {
          tuKhoa: k.tuKhoa,
          chienDich,
          ngay,
          hienThi: k.hienThi,
          cuBam: k.cuBam,
          chiPhi: k.chiPhi,
          ctr: k.ctr,
          cpcTrungBinh: k.cpcTrungBinh,
          cuChuyenDoi: k.cuChuyenDoi,
        },
        update: {
          hienThi: k.hienThi,
          cuBam: k.cuBam,
          chiPhi: k.chiPhi,
          ctr: k.ctr,
          cpcTrungBinh: k.cpcTrungBinh,
          cuChuyenDoi: k.cuChuyenDoi,
        },
      });
      daGhi++;
    }
    return { ok: true, daGhi };
  }

  /**
   * Review một diện từ khoá bằng GPT rồi upsert trạng thái + append log.
   *
   * `ids` rỗng/thiếu = tự chọn diện: từ khoá trong snapshot có `cuBam >= 1`
   * (đã cắn tiền) và chưa được review trong khoảng lịch lại. `ids` truyền vào
   * là ép review lại ĐÚNG những dòng đó (bỏ qua lịch lại — người dùng chủ động).
   */
  async review(ids?: string[]): Promise<{
    ok: boolean;
    daReview: number;
    danhSach: Array<{ tuKhoa: string; quyetDinh: string; lyDo: string | null; diem: number | null }>;
    loi?: string;
  }> {
    const danhSach: Array<{ tuKhoa: string; quyetDinh: string; lyDo: string | null; diem: number | null }> = [];
    const bamCo = ids !== undefined && Array.isArray(ids) && ids.length > 0;

    // 1. Xác định diện từ khoá.
    let dien: string[];
    if (bamCo) {
      // Bỏ id không đúng khuôn (tầng DTO đã lo, service tự phòng cho cron/curl),
      // dẹp trùng, rồi đọc đúng các dòng whitelist đó.
      const sach = Array.from(new Set(ids!.filter((id) => KHUON_UUID.test(id))));
      if (!sach.length) return { ok: true, daReview: 0, danhSach, loi: "ids không hợp lệ" };
      const dong = await this.prisma.koiKeywordWhitelist.findMany({ where: { id: { in: sach } } });
      dien = Array.from(new Set(dong.map((k) => k.tuKhoa)));
      if (!dien.length) return { ok: true, daReview: 0, danhSach, loi: "Không tìm thấy từ khoá nào trong whitelist" };
    } else {
      // Tự chọn: từ khoá đã cắn tiền trong cửa sổ, tổng chi phí cao review trước.
      const tieuChi = await this.prisma.koiKeywordMetric.groupBy({
        by: ["tuKhoa"],
        where: { cuBam: { gte: 1 }, ngay: { gte: this.truNgay(this.soNgayReview()) } },
        _sum: { chiPhi: true },
        orderBy: { _sum: { chiPhi: "desc" } },
      });
      dien = tieuChi.slice(0, TOI_DA_LO * this.batch()).map((t) => t.tuKhoa);
      if (!dien.length) return { ok: true, daReview: 0, danhSach, loi: "Không có từ khoá nào trong diện review" };

      // Lọc theo lịch lại: bỏ từ đã được review trong khoảng LICH_LAI_NGAY.
      const daCo = await this.prisma.koiKeywordWhitelist.findMany({
        where: { tuKhoa: { in: dien } },
        select: { tuKhoa: true, ngayReview: true },
      });
      const mocLich = new Date(Date.now() - this.lichLaiNgay() * NGAY_MS);
      const conThieu = new Set<string>();
      for (const k of dien) {
        const dong = daCo.find((d) => d.tuKhoa === k);
        if (!dong || dong.ngayReview < mocLich) conThieu.add(k);
      }
      dien = Array.from(conThieu);
      if (!dien.length) return { ok: true, daReview: 0, danhSach, loi: "Tất cả từ khoá cắn tiền đã được review gần đây" };
    }

    // 2. Metric mới nhất của từng từ để dựng prompt.
    const mo = new Map<string, {
      id: string;
      chienDich: string | null;
      hienThi: number;
      cuBam: number;
      chiPhi: number;
      cuChuyenDoi: number | null;
    }>();
    const cac = await this.prisma.koiKeywordMetric.findMany({
      where: { tuKhoa: { in: dien } },
      select: { id: true, tuKhoa: true, chienDich: true, ngay: true, hienThi: true, cuBam: true, chiPhi: true, cuChuyenDoi: true },
      orderBy: { ngay: "desc" },
    });
    for (const m of cac) if (!mo.has(m.tuKhoa)) mo.set(m.tuKhoa, m);

    // 3. Chia lô và gọi GPT, gom kết quả parse được chứ không dừng cả lô.
    const vao = dien.slice(0, TOI_DA_LO * this.batch());
    const loiTo = this.batch();
    let daReview = 0;
    for (let dau = 0; dau < vao.length; dau += loiTo) {
      const lo = vao.slice(dau, dau + loiTo);
      const dongNguoiDung = lo
        .map((tuKhoa, i) => {
          const m = mo.get(tuKhoa);
          const so = !m
            ? { chienDich: "", hienThi: 0, cuBam: 0, chiPhi: 0, cuChuyenDoi: null }
            : m;
          return `${i + 1}. "${tuKhoa}" | ${so.chienDich || "—"} | ${so.hienThi} | ${so.cuBam} | ${Math.round(so.chiPhi)} | ${so.cuChuyenDoi ?? 0}`;
        })
        .join("\n");
      const caGui =
        `Đánh giá từng từ khoá dưới đây để quyết định đưa vào whitelist SEO. Mỗi dòng: "từ khoá" | ` +
        `chiến dịch | hiển thị | click | chi phí VND | chuyển đổi.\n${dongNguoiDung}\n` +
        `Trả về JSON đúng khuôn đã nêu trong hướng dẫn hệ thống.`;

      let duLieu: unknown;
      try {
        const kq = await this.openai.sinhJson(HE_THONG, caGui, TOI_DA_TOKEN);
        duLieu = kq.dulieu;
      } catch (e) {
        const loi = e as Error;
        this.log.warn(`Review lô ${dau / loiTo + 1} lỗi: ${loi.message}`);
        continue;
      }

      const mang = (duLieu && typeof duLieu === "object" && "danhGia" in duLieu
        ? (duLieu as { danhGia?: unknown }).danhGia
        : null);
      if (!Array.isArray(mang)) continue;

      for (const b of mang) {
        if (!b || typeof b !== "object") continue;
        const d = b as Record<string, unknown>;
        const tuKhoa = typeof d.tuKhoa === "string" ? d.tuKhoa.trim() : "";
        if (!tuKhoa || !vao.includes(tuKhoa)) continue;
        let quyetDinh: string | null = null;
        if (d.quyetDinh === "whitelist" || d.quyetDinh === "whitelisted") quyetDinh = "whitelisted";
        else if (d.quyetDinh === "reject" || d.quyetDinh === "rejected") quyetDinh = "rejected";
        if (!quyetDinh) continue;
        const diem = Number(d.diem);
        if (!Number.isInteger(diem) || diem < 0 || diem > 100) continue;
        const lyDo = typeof d.lyDo === "string" ? d.lyDo.slice(0, 500) : null;

        const metric = mo.get(tuKhoa);
        const dongCong = new Date();
        await this.prisma.koiKeywordWhitelist.upsert({
          where: { tuKhoa },
          create: {
            tuKhoa,
            chienDich: metric?.chienDich || "",
            trangThai: quyetDinh,
            lyDo,
            diem,
            nguonReview: "ai",
            model: this.openai.modelDangDung(),
            ngayReview: dongCong,
          },
          update: { trangThai: quyetDinh, lyDo, diem, nguonReview: "ai", model: this.openai.modelDangDung(), ngayReview: dongCong },
        });
        await this.prisma.koiKeywordReviewLog.create({
          data: {
            tuKhoa,
            quyetDinh,
            lyDo,
            diem,
            model: this.openai.modelDangDung(),
            metricId: metric?.id ?? null,
            ngayReview: dongCong,
          },
        });
        daReview++;
        danhSach.push({ tuKhoa, quyetDinh, lyDo, diem });
      }
    }

    return { ok: true, daReview, danhSach };
  }
}