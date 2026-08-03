/**
 * Khoá lại hai lỗi ĐÃ TỪNG XẢY RA trên dữ liệu thật, không phải test cho đủ lệ.
 *
 * 1. slug/code rụng chữ hoa có dấu: VIETNAMESE_MAP chỉ có khoá chữ thường nên
 *    Ố, Đ, Ư… không khớp bảng rồi bị bộ lọc [^a-z0-9] xoá hẳn. "Ốp lưng iPhone"
 *    ra "p-lung-iphone", "ĐỎ ĐEN" ra "en". Đây là ĐƯỜNG DẪN CÔNG KHAI và mã SKU.
 *
 * 2. Ô tìm kiếm: cột `name` là TEXT chứa JSON {"vi":"..."} nên tìm "vi" khớp cái
 *    khoá ở mọi dòng (trả cả 315 món), còn cả chuỗi bị nhét vào một `contains`
 *    nên "vi da nam" ra 0.
 */
import { generateSlug, generateCode } from "./slugAndCodeGenerator";
import {
  boDauTiengViet,
  tachTuKhoa,
  dieuKienTimSanPham,
  gopVaoAnd,
} from "./tim-san-pham";
import { Prisma } from "@prisma/client";

describe("generateSlug / generateCode", () => {
  // Từng ca ở đây là một chuỗi CÓ THẬT trong danh mục, kèm kết quả sai cũ.
  it.each([
    ["Ốp lưng iPhone Da Epsom", "op-lung-iphone-da-epsom"], // cũ: p-lung-…
    ["Đồng hồ da cá sấu", "dong-ho-da-ca-sau"], // cũ: ong-ho-…
    ["Đan lát Woven", "dan-lat-woven"], // cũ: an-lat-woven
    ["Bọc Khoá Ô Tô", "boc-khoa-o-to"], // cũ: boc-khoa-to
    ["ĐỎ ĐEN", "do-den"], // cũ: en
    ["Ví Da Cho Nữ", "vi-da-cho-nu"],
    ["Túi Da Cho Nữ", "tui-da-cho-nu"],
  ])("giữ đủ chữ hoa có dấu: %s", (vao, ra) => {
    expect(generateSlug(vao)).toBe(ra);
    expect(generateCode(vao)).toBe(ra.toUpperCase());
  });

  it("không rụng bất kỳ chữ Việt có dấu nào, hoa hay thường", () => {
    const chu =
      "àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ";
    const sot: string[] = [];
    for (const ch of chu) {
      for (const c of [ch, ch.toUpperCase()]) {
        // Kẹp giữa 'x' để phân biệt "bị xoá" với "bị cắt ở đầu/cuối".
        if (generateSlug(`x${c}x`) === "xx") sot.push(c);
      }
    }
    expect(sot).toEqual([]);
  });

  it("chuỗi không còn ký tự nào thì trả về nhãn dự phòng, không trả chuỗi rỗng", () => {
    expect(generateSlug("!!!")).toBe("untitled");
    expect(generateCode("!!!")).toBe("UNTITLED");
  });
});

describe("tachTuKhoa", () => {
  it("bỏ dấu và cắt thành token, giữ cả dạng còn dấu để dò cột name", () => {
    expect(tachTuKhoa("Ví Da Nữ")).toEqual([
      { tho: "Ví", sach: "vi" },
      { tho: "Da", sach: "da" },
      { tho: "Nữ", sach: "nu" },
    ]);
  });

  it("từ khoá rác không sinh token nào", () => {
    for (const rac of ["   ", "{}", "%%%", "!!!", ""]) {
      expect(tachTuKhoa(rac)).toEqual([]);
    }
  });

  it("chặn trên 6 token để khách dán cả đoạn văn không dựng 50 điều kiện", () => {
    expect(tachTuKhoa("a b c d e f g h i j").length).toBe(6);
  });

  it("boDauTiengViet xử được đ/Đ (không phải dấu tổ hợp)", () => {
    expect(boDauTiengViet("Đỏ đen")).toBe("Do den");
  });
});

describe("dieuKienTimSanPham", () => {
  /** Có nhánh nào dò vào cột `name` không? */
  const coNhanhName = (dk: Prisma.KoiProductWhereInput) =>
    (dk.OR as Prisma.KoiProductWhereInput[]).some((n) => "name" in n);

  it("trả undefined khi không còn token — bên gọi phải hiểu là KHÔNG lọc gì", () => {
    // Nếu chỗ này trả [] thì where.AND = [] và khách nhận trang trắng.
    for (const rac of ["   ", "{}", "%%%"]) {
      expect(dieuKienTimSanPham(rac)).toBeUndefined();
    }
  });

  it("mỗi token một điều kiện, AND lại — chứ không nhét cả chuỗi vào một contains", () => {
    const dk = dieuKienTimSanPham("vi da nam")!;
    expect(dk).toHaveLength(3);
  });

  it('KHÔNG dò cột name với token trùng khoá JSON ("vi", "en"…)', () => {
    // Đây chính là lỗi ?search=vi trả về toàn bộ shop.
    for (const kw of ["vi", "en", "v", "i", "e", "n"]) {
      const dk = dieuKienTimSanPham(kw)!;
      expect(coNhanhName(dk[0])).toBe(false);
    }
  });

  it("VẪN dò cột name với token ngắn khác — chặn theo danh sách, không theo độ dài", () => {
    // Từng thử "token ≤2 ký tự thì bỏ": "ốp lưng" tụt từ 19 kết quả xuống 0.
    const dk = dieuKienTimSanPham("ốp lưng")!;
    expect(coNhanhName(dk[0])).toBe(true);
    // Dạng còn dấu mới là thứ dò vào name (slug đã mất chữ Ố).
    const nhanhName = (dk[0].OR as Prisma.KoiProductWhereInput[]).find(
      (n) => "name" in n,
    ) as any;
    expect(nhanhName.name.contains).toBe("ốp");
  });

  it("mỗi token dò được cả slug, sku và slug danh mục", () => {
    const dk = dieuKienTimSanPham("tui")!;
    const nhanh = dk[0].OR as Prisma.KoiProductWhereInput[];
    expect(nhanh.some((n) => "slug" in n)).toBe(true);
    expect(nhanh.some((n) => "sku" in n)).toBe(true);
    expect(nhanh.some((n) => "categoryLinks" in n)).toBe(true);
  });

  it("chỉ admin mới dò technicalSpecs", () => {
    const co = (dk: Prisma.KoiProductWhereInput[]) =>
      (dk[0].OR as Prisma.KoiProductWhereInput[]).some(
        (n) => "technicalSpecs" in n,
      );
    expect(co(dieuKienTimSanPham("epsom", true)!)).toBe(true);
    expect(co(dieuKienTimSanPham("epsom", false)!)).toBe(false);
  });
});

describe("gopVaoAnd", () => {
  it("cộng dồn, KHÔNG đè điều kiện AND đã có", () => {
    // Trang quản trị dùng where.AND cho lọc loại da và nhóm "thiếu thông tin";
    // gán thẳng where.AND = ... là âm thầm xoá bộ lọc khách đang bật.
    const where: Prisma.KoiProductWhereInput = {
      AND: [{ basePrice: null }],
    };
    gopVaoAnd(where, [{ slug: { contains: "vi" } }]);
    expect(where.AND).toHaveLength(2);
  });

  it("gói AND dạng object đơn lẻ thành mảng thay vì mất nó", () => {
    const where: Prisma.KoiProductWhereInput = { AND: { basePrice: null } };
    gopVaoAnd(where, [{ slug: { contains: "vi" } }]);
    expect(where.AND).toHaveLength(2);
  });

  it("thêm mảng rỗng thì không tạo AND rỗng", () => {
    const where: Prisma.KoiProductWhereInput = {};
    gopVaoAnd(where, []);
    expect(where.AND).toBeUndefined();
  });
});
