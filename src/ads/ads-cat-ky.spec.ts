/**
 * danhSach() phải cắt mỗi con số theo ĐÚNG cột thời gian của việc nó đếm.
 *
 * Lỗi từng có: cả năm con số đếm trên `rows` — tập đã cắt theo `clickedAt` —
 * nên chúng trả lời "trong số quảng cáo BẤM trong kỳ, bao nhiêu về sau chốt
 * được". Chuyển đổi luôn xảy ra SAU cú bấm, thường vài ngày, nên kỳ ngắn thì
 * gần như chắc chắn ra 0: panel ghi "Đã chốt 0" đúng vào ngày có đơn chốt thật.
 *
 * Kiểm bằng cách soi `where` gửi xuống Prisma chứ không soi số trả về — cách
 * này không cần cơ sở dữ liệu, và nó khoá đúng thứ dễ vỡ: dùng cột nào để cắt.
 */
import { AdsService } from "./ads.service";
import { dauNgayVN } from "../common/ngay-vn";

/** Ghi lại mọi lượt gọi để bài kiểm soi `where`. */
function prismaGia() {
  const daGoi: { ten: string; arg: any }[] = [];
  const ghi = (ten: string) => (arg: any) => {
    daGoi.push({ ten, arg });
    if (ten === "aggregate") return Promise.resolve({ _sum: { value: null } });
    if (ten === "count") return Promise.resolve(0);
    return Promise.resolve([]);
  };
  return {
    daGoi,
    koiAdClick: {
      findMany: ghi("findMany"),
      count: ghi("count"),
      aggregate: ghi("aggregate"),
    },
  };
}

/**
 * Tham số thứ hai là GoogleAdsClient — chỉ dùng cho phần từ khoá, `danhSach()`
 * không chạm tới. Truyền null để bài kiểm không phải dựng cả client thật.
 */
const dichVu = (p: any) => new AdsService(p as never, null as never);

/** Mốc `gte` mà một lượt gọi đã dùng, theo tên cột. */
const mocCua = (arg: any, cot: string) => arg?.where?.[cot]?.gte;

/** Những lượt count() có cắt theo cột này. */
const demTheo = (p: any, cot: string) =>
  p.daGoi.filter((g: any) => g.ten === "count" && mocCua(g.arg, cot) !== undefined);

/**
 * Tìm một lượt gọi theo tên, ném lỗi nếu không có.
 *
 * find() trả undefined nên TypeScript chặn mọi lần đọc `.arg` sau đó. Ném ở đây
 * cho bài kiểm đỏ ngay tại chỗ thiếu, thay vì đỏ vì đọc thuộc tính của undefined
 * ở một dòng khác — đọc log lỗi sẽ không ra được là thiếu lượt gọi nào.
 */
function motLuot(p: any, ten: string) {
  const g = p.daGoi.find((x: any) => x.ten === ten);
  if (!g) throw new Error(`danhSach() không gọi ${ten}()`);
  return g;
}

describe("danhSach cắt kỳ theo đúng cột thời gian", () => {
  it("có đếm theo contactedAt và theo convertedAt, không chỉ theo clickedAt", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(1);

    // Đây là bài chính: thiếu hai dòng này là lỗi cũ quay lại.
    expect(demTheo(p, "contactedAt").length).toBeGreaterThan(0);
    expect(demTheo(p, "convertedAt").length).toBeGreaterThan(0);
  });

  it("mọi lượt cắt kỳ dùng CÙNG một mốc", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(7);

    const moc = p.daGoi
      .flatMap((g: any) =>
        ["clickedAt", "contactedAt", "convertedAt"].map((c) => mocCua(g.arg, c)),
      )
      .filter(Boolean)
      .map((d: Date) => +d);

    expect(moc.length).toBeGreaterThan(0);
    expect(new Set(moc).size).toBe(1);
    expect(moc[0]).toBe(+dauNgayVN(6));
  });

  it("days = 1 là đầu ngày HÔM NAY giờ Việt Nam", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(1);
    const g = motLuot(p, "findMany");
    expect(+mocCua(g.arg, "clickedAt")).toBe(+dauNgayVN(0));
  });

  it("doanh thu cộng theo convertedAt, không theo clickedAt", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(1);
    const agg = motLuot(p, "aggregate");
    expect(mocCua(agg.arg, "convertedAt")).toBeDefined();
    expect(mocCua(agg.arg, "clickedAt")).toBeUndefined();
  });

  it("daXuat lấy mẫu số cùng tập với daChot: cắt theo convertedAt, không theo exportedAt", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(30);
    const g = demTheo(p, "convertedAt").find(
      (x: any) => x.arg.where.exportedAt !== undefined,
    );
    if (!g) throw new Error("thieu count() dem don da xuat");
    // exportedAt chỉ được dùng làm điều kiện "đã gửi", KHÔNG dùng để cắt kỳ.
    expect(g.arg.where.exportedAt).toEqual({ not: null });
    expect(mocCua(g.arg, "exportedAt")).toBeUndefined();
  });

  it("bảng vẫn cắt theo clickedAt — nó trả lời câu khác", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(1);
    const g = motLuot(p, "findMany");
    expect(mocCua(g.arg, "clickedAt")).toBeDefined();
    expect(mocCua(g.arg, "contactedAt")).toBeUndefined();
    expect(mocCua(g.arg, "convertedAt")).toBeUndefined();
  });

  it("không đếm bằng filter() trên mảng bị chặn take: 500", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(365);
    // Bốn con số (daLienHe, daChot, daXuat, soDonCoTien) phải là count() riêng.
    expect(p.daGoi.filter((g: any) => g.ten === "count").length).toBeGreaterThanOrEqual(4);
    expect(p.daGoi.filter((g: any) => g.ten === "findMany").length).toBe(1);
  });

  it("mọi lượt đếm đều lọc dòng có mã Google", async () => {
    const p = prismaGia();
    await dichVu(p).danhSach(7);
    for (const g of p.daGoi) {
      expect(Array.isArray(g.arg?.where?.OR)).toBe(true);
      expect(g.arg.where.OR).toHaveLength(3);
    }
  });

  /**
   * Số âm ra 1 ngày, KHÔNG ra 90: `Number(-5) || 90` giữ nguyên -5 (chỉ số 0 và
   * NaN mới rơi về 90), rồi `Math.max(-5, 1)` kẹp lên 1. Ghi rõ ở đây vì đọc
   * dòng kẹp đó rất dễ tưởng mọi giá trị lạ đều về mặc định. Kẹp về kỳ HẸP nhất
   * là hướng an toàn: không bao giờ ra mốc ở tương lai.
   */
  it("kẹp days: 0 về 90, số âm về 1, quá 365 xuống 365", async () => {
    for (const [vao, mong] of [
      [0, 90],
      [-5, 1],
      [7.9, 7],
      [5000, 365],
    ] as const) {
      const p = prismaGia();
      const kq: any = await dichVu(p).danhSach(vao);
      expect(kq.days).toBe(mong);
      const g = motLuot(p, "findMany");
      expect(+mocCua(g.arg, "clickedAt")).toBe(+dauNgayVN(mong - 1));
    }
  });

  it("doanhThu là chuỗi, và _sum null ra '0' chứ không phải 'null'", async () => {
    const p = prismaGia();
    const kq: any = await dichVu(p).danhSach(1);
    expect(typeof kq.doanhThu).toBe("string");
    expect(kq.doanhThu).toBe("0");
    expect(() => JSON.stringify(kq)).not.toThrow();
  });
});
