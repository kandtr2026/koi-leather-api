import { docChu, docKhoa, gomNoiDung, type LuotTheoTrang } from "./noi-dung";

describe("docChu", () => {
  it("đọc tên sản phẩm từ khối song ngữ", () => {
    // Cột KoiProduct.name khai String nhưng dữ liệu thật là JSON — không xử lý
    // thì cả cột Tên sản phẩm hiện '[object Object]'.
    expect(docChu({ vi: "Ví Da Nam", en: "Men Wallet" })).toBe("Ví Da Nam");
  });

  it("rơi về tiếng Anh khi thiếu tiếng Việt", () => {
    expect(docChu({ en: "Men Wallet" })).toBe("Men Wallet");
    expect(docChu({ vi: "", en: "Men Wallet" })).toBe("Men Wallet");
  });

  it("chuỗi trần (posts.title) giữ nguyên", () => {
    expect(docChu("DỊCH VỤ LÀM TÚI DA THEO YÊU CẦU")).toBe(
      "DỊCH VỤ LÀM TÚI DA THEO YÊU CẦU",
    );
  });

  it("rỗng / null / kiểu lạ thì ra chuỗi rỗng, không ném lỗi", () => {
    expect(docChu(null)).toBe("");
    expect(docChu(undefined)).toBe("");
    expect(docChu({})).toBe("");
    expect(docChu(123)).toBe("");
  });
});

describe("docKhoa", () => {
  it("nhận ra trang chi tiết sản phẩm tiếng Việt", () => {
    expect(docKhoa("/cua-hang/tui-loom-tui-xach-da-bo/")).toEqual({
      loai: "san-pham",
      slug: "tui-loom-tui-xach-da-bo",
      ngonNgu: "vi",
    });
  });

  it("nhận ra bản tiếng Anh của cùng sản phẩm", () => {
    expect(docKhoa("/en/shop/vi-da-nam-da-alligator-black-x-red/")).toEqual({
      loai: "san-pham",
      slug: "vi-da-nam-da-alligator-black-x-red",
      ngonNgu: "en",
    });
  });

  it("KHÔNG coi /san-pham/* là sản phẩm — đó là trang danh mục", () => {
    // Bẫy chính của cả tính năng: tiền tố nghe như sản phẩm nhưng là danh mục.
    // Đọc nhầm thì "túi da cho nữ" (572 lượt) đứng đầu bảng sản phẩm mà không
    // hề là một sản phẩm nào.
    expect(docKhoa("/san-pham/tui-da-cho-nu/")).toBeNull();
  });

  it("KHÔNG coi trang danh sách /cua-hang/ là sản phẩm", () => {
    expect(docKhoa("/cua-hang/")).toEqual({
      loai: "trang-goc",
      slug: "cua-hang",
      ngonNgu: "vi",
    });
  });

  it("coi trang một tầng ở gốc là ỨNG VIÊN bài viết", () => {
    expect(docKhoa("/dich-vu-lam-tui-da-theo-yeu-cau/")).toEqual({
      loai: "trang-goc",
      slug: "dich-vu-lam-tui-da-theo-yeu-cau",
      ngonNgu: "vi",
    });
  });

  it("thiếu gạch chéo cuối vẫn ra cùng khoá", () => {
    expect(docKhoa("/blog")).toEqual(docKhoa("/blog/"));
  });

  it("bỏ query và hash sót lại từ dòng cũ", () => {
    expect(
      docKhoa("/cua-hang/tui-chub-da-bo-yellow/?utm_source=fb")?.slug,
    ).toBe("tui-chub-da-bo-yellow");
    expect(docKhoa("/cua-hang/tui-chub-da-bo-yellow#anh")?.slug).toBe(
      "tui-chub-da-bo-yellow",
    );
  });

  it("trang chủ và đường dẫn nhiều tầng lạ thì trả null", () => {
    expect(docKhoa("/")).toBeNull();
    expect(docKhoa("")).toBeNull();
    expect(docKhoa("/en/bespoke/")).toBeNull();
    expect(docKhoa("/tag/da-bo/")).toBeNull();
  });
});

describe("gomNoiDung", () => {
  const d = (
    path: string,
    luot: number,
    khach: number,
    moiNhat: Date | null = null,
  ): LuotTheoTrang => ({
    path,
    luot,
    khach,
    moiNhat,
  });

  it("gộp bản Việt và bản Anh của cùng sản phẩm về một cụm", () => {
    const { cum } = gomNoiDung([
      d("/cua-hang/vi-da-nam/", 50, 39),
      d("/en/shop/vi-da-nam/", 6, 5),
    ]);
    expect(cum.size).toBe(1);
    const c = cum.get("san-pham:vi-da-nam")!;
    expect(c.luot).toBe(56);
    expect(c.khach).toBe(44); // tổng cộng dồn — xem ghi chú trong noi-dung.ts
    expect(c.duongDan).toEqual(["/cua-hang/vi-da-nam/", "/en/shop/vi-da-nam/"]);
  });

  it("gộp cả biến thể thiếu gạch chéo cuối", () => {
    const { cum } = gomNoiDung([d("/blog/", 102, 54), d("/blog", 4, 4)]);
    expect(cum.size).toBe(1);
    expect(cum.get("trang-goc:blog")!.luot).toBe(106);
  });

  it("không trộn sản phẩm với bài viết trùng slug", () => {
    const { cum } = gomNoiDung([
      d("/cua-hang/day-dong-ho-da-ca-sau/", 18, 15),
      d("/day-dong-ho-da-ca-sau/", 7, 6),
    ]);
    expect(cum.size).toBe(2);
    expect(cum.get("san-pham:day-dong-ho-da-ca-sau")!.luot).toBe(18);
    expect(cum.get("trang-goc:day-dong-ho-da-ca-sau")!.luot).toBe(7);
  });

  it("giữ mốc xem gần nhất lớn nhất trong cụm", () => {
    const cu = new Date("2026-09-01T00:00:00Z");
    const moi = new Date("2026-09-15T00:00:00Z");
    const { cum } = gomNoiDung([
      d("/cua-hang/x/", 1, 1, cu),
      d("/en/shop/x/", 1, 1, moi),
    ]);
    expect(cum.get("san-pham:x")!.moiNhat).toEqual(moi);
  });

  it("đường dẫn không bóc được slug thì rơi vào khac, không bị đánh rơi", () => {
    const { cum, khac } = gomNoiDung([
      d("/san-pham/tui-da-cho-nu/", 572, 370),
      d("/", 1787, 900),
      d("/cua-hang/tui/", 10, 8),
    ]);
    expect(cum.size).toBe(1);
    expect(khac.map((k) => k.path)).toEqual(["/san-pham/tui-da-cho-nu/", "/"]);
  });
});
