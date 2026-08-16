/**
 * Gom khách theo IP — nhất là thứ tự (mới nhất trước) và chuyện "lượt đầu
 * quy nguồn", hai chỗ dễ sai im lặng nhất.
 */
import { gomKhachIp, gomTheoKhuVuc, type LuotKhachIp } from "./khach-ip";

const GOC = Date.UTC(2026, 7, 14, 3, 0, 0);
const PHUT = 60 * 1000;

function luot(p: Partial<LuotKhachIp> & { sauGoc?: number } = {}): LuotKhachIp {
  return {
    visitorHash: p.visitorHash ?? "khach-a",
    ip: p.ip === undefined ? "1.2.3.4" : p.ip,
    khuVuc: p.khuVuc === undefined ? "Hà Nội" : p.khuVuc,
    path: p.path ?? "/",
    source: p.source ?? "google",
    device: p.device ?? "mobile",
    luc: p.luc ?? GOC + (p.sauGoc ?? 0) * PHUT,
  };
}

describe("gomKhachIp", () => {
  it("gộp mọi lượt của một khách thành một dòng, lấy lượt ĐẦU quy nguồn", () => {
    const ra = gomKhachIp(
      [
        // Đầu vào lộn xộn: lượt sau (source internal) xuất hiện TRƯỚC lượt đầu.
        luot({ visitorHash: "a", sauGoc: 30, path: "/cua-hang/", source: "internal" }),
        luot({ visitorHash: "a", sauGoc: 0, path: "/", source: "facebook" }),
      ],
      50,
    );
    expect(ra).toHaveLength(1);
    expect(ra[0].source).toBe("facebook");
    expect(ra[0].path).toBe("/");
    expect(ra[0].luot).toBe(2);
    expect(ra[0].dauTien).toBe(GOC);
    expect(ra[0].ganNhat).toBe(GOC + 30 * PHUT);
  });

  it("sắp mới nhất lên đầu, không phụ thuộc thứ tự đầu vào", () => {
    const ra = gomKhachIp(
      [
        luot({ visitorHash: "cu", sauGoc: 5 }),
        luot({ visitorHash: "moi", sauGoc: 90 }),
        luot({ visitorHash: "giua", sauGoc: 40 }),
      ],
      50,
    );
    expect(ra.map((r) => r.ip)).toEqual(["1.2.3.4", "1.2.3.4", "1.2.3.4"].slice(0, 3));
    // Hàm này không lộ hash — chỉ kiểm tra thứ tự qua thời gian.
    expect(ra.map((r) => r.ganNhat)).toEqual([
      GOC + 90 * PHUT,
      GOC + 40 * PHUT,
      GOC + 5 * PHUT,
    ]);
  });

  it("cắt đúng gioiHan, giữ phần mới nhất", () => {
    const ra = gomKhachIp(
      [luot({ visitorHash: "a", sauGoc: 0 }), luot({ visitorHash: "b", sauGoc: 10 }), luot({ visitorHash: "c", sauGoc: 20 })],
      2,
    );
    expect(ra).toHaveLength(2);
    expect(ra[0].ganNhat).toBe(GOC + 20 * PHUT);
    expect(ra[1].ganNhat).toBe(GOC + 10 * PHUT);
  });

  it("bỏ lượt thiếu IP (dòng pre-2026-08) và thiếu visitorHash", () => {
    const ra = gomKhachIp(
      [
        luot({ visitorHash: "co-ip" }),
        luot({ visitorHash: "khong-ip", ip: null }),
        luot({ visitorHash: "", ip: "9.9.9.9" }),
      ],
      50,
    );
    expect(ra).toHaveLength(1);
    expect(ra[0].ip).toBe("1.2.3.4");
  });

  it("mảng rỗng ra rỗng; gioiHan 0 hoặc âm vẫn trả ít nhất một dòng", () => {
    expect(gomKhachIp([], 50)).toEqual([]);
    expect(gomKhachIp([luot()], 0)).toHaveLength(1);
  });

  it("giữ nguyên khu vực của lượt đầu", () => {
    const ra = gomKhachIp(
      [luot({ visitorHash: "a", sauGoc: 0, khuVuc: "Mỹ" }), luot({ visitorHash: "a", sauGoc: 5, khuVuc: "Hà Nội" })],
      50,
    );
    expect(ra[0].khuVuc).toBe("Mỹ");
  });
});

describe("gomTheoKhuVuc", () => {
  it("gom khách theo khu vực, khách đếm riêng theo hash không đếm lượt", () => {
    const ra = gomTheoKhuVuc([
      luot({ visitorHash: "a", khuVuc: "Hà Nội" }),
      luot({ visitorHash: "a", khuVuc: "Hà Nội" }),
      luot({ visitorHash: "b", khuVuc: "Hà Nội" }),
      luot({ visitorHash: "c", khuVuc: "TP Hồ Chí Minh" }),
      luot({ visitorHash: "d", khuVuc: "TP Hồ Chí Minh" }),
    ]);
    expect(ra).toHaveLength(2);
    expect(ra[0]).toEqual({ ten: "Hà Nội", khach: 2, luot: 3 });
    expect(ra[1]).toEqual({ ten: "TP Hồ Chí Minh", khach: 2, luot: 2 });
  });

  it("một khách chuyển khu vực giữa các lượt thì tính ở cả hai nơi họ vào", () => {
    const ra = gomTheoKhuVuc([
      luot({ visitorHash: "a", khuVuc: "Hà Nội" }),
      luot({ visitorHash: "a", khuVuc: "Đà Nẵng" }),
    ]);
    expect(ra).toHaveLength(2);
    expect(ra[0].khach).toBe(1);
    expect(ra[1].khach).toBe(1);
  });

  it("khu vực trống gom vào 'Không biết' chứ không biến mất", () => {
    const ra = gomTheoKhuVuc([
      luot({ visitorHash: "a", khuVuc: null }),
      luot({ visitorHash: "b", khuVuc: "" }),
    ]);
    expect(ra).toEqual([{ ten: "Không biết", khach: 2, luot: 2 }]);
  });

  it("bỏ lượt thiếu visitorHash — đếm vào chỉ làm sai tỉ lệ", () => {
    const ra = gomTheoKhuVuc([
      luot({ visitorHash: "", khuVuc: "Hà Nội" }),
      luot({ visitorHash: "a", khuVuc: "Hà Nội" }),
    ]);
    expect(ra).toEqual([{ ten: "Hà Nội", khach: 1, luot: 1 }]);
  });

  it("sắp khu vực đông khách trước; hoà khách thì nhiều lượt trước; mảng rỗng ra rỗng", () => {
    expect(gomTheoKhuVuc([])).toEqual([]);
    const ra = gomTheoKhuVuc([
      luot({ visitorHash: "a", khuVuc: "Hà Nam" }),
      luot({ visitorHash: "a", khuVuc: "Hà Nam" }),
      luot({ visitorHash: "b", khuVuc: "Đồng Nai" }),
      luot({ visitorHash: "c", khuVuc: "Đồng Nai" }),
      luot({ visitorHash: "d", khuVuc: "Đồng Nai" }),
    ]);
    expect(ra[0].ten).toBe("Đồng Nai");
    expect(ra[1]).toEqual({ ten: "Hà Nam", khach: 1, luot: 2 });
  });
});