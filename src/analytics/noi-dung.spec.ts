import {
  docChu,
  docKhoa,
  gomChieu,
  gomNoiDung,
  khoaDong,
  mocThoiGian,
  type LuotTheoTrang,
} from "./noi-dung";

describe("mocThoiGian", () => {
  // Đồng hồ giả: đầu ngày N ngày trước = 2026-09-18 trừ N ngày, lúc 00:00 giờ ta.
  const dauNgay = (lui: number) =>
    new Date(Date.UTC(2026, 8, 18 - lui, 0, 0, 0) - 7 * 3600 * 1000);
  const bayGio = () => new Date(Date.UTC(2026, 8, 18, 3, 52, 0));

  it("hôm nay = từ đầu hôm nay tới bây giờ", () => {
    const { tu, den } = mocThoiGian(1, 0, dauNgay, bayGio);
    expect(tu).toEqual(dauNgay(0));
    expect(den).toEqual(bayGio());
  });

  it("hôm qua có mốc cuối thật, KHÔNG chạy lấn sang hôm nay", () => {
    // Bẫy chính của góp ý #5: quên mốc cuối thì "hôm qua" hoá "hôm qua tới giờ",
    // gộp luôn hôm nay — con số chỉ hơi to chứ không sai lộ liễu, không ai soi ra.
    const { tu, den } = mocThoiGian(1, 1, dauNgay, bayGio);
    expect(tu).toEqual(dauNgay(1));
    expect(den).toEqual(dauNgay(0));
    expect(den.getTime() - tu.getTime()).toBe(24 * 3600 * 1000);
  });

  it("7 ngày gần nhất vẫn chạy tới bây giờ như cũ", () => {
    const { tu, den } = mocThoiGian(7, 0, dauNgay, bayGio);
    expect(tu).toEqual(dauNgay(6));
    expect(den).toEqual(bayGio());
  });

  it("khoảng nhiều ngày kết thúc ở hôm qua phủ đúng số ngày", () => {
    const { tu, den } = mocThoiGian(7, 1, dauNgay, bayGio);
    expect(tu).toEqual(dauNgay(7));
    expect(den).toEqual(dauNgay(0));
    expect(den.getTime() - tu.getTime()).toBe(7 * 24 * 3600 * 1000);
  });

  it("mốc đầu luôn trước mốc cuối", () => {
    for (const [n, lui] of [
      [1, 0],
      [1, 1],
      [7, 0],
      [30, 0],
      [365, 0],
      [1, 30],
    ]) {
      const { tu, den } = mocThoiGian(n, lui, dauNgay, bayGio);
      expect(tu.getTime()).toBeLessThan(den.getTime());
    }
  });
});

describe("khoaDong", () => {
  it("sản phẩm và bài viết gộp theo slug", () => {
    expect(khoaDong("/cua-hang/vi-da-nam/")).toBe("san-pham:vi-da-nam");
    expect(khoaDong("/en/shop/vi-da-nam/")).toBe("san-pham:vi-da-nam");
    expect(khoaDong("/sua-tui-lv/")).toBe("trang-goc:sua-tui-lv");
  });

  it("trang khác giữ nguyên đường dẫn làm khoá", () => {
    expect(khoaDong("/san-pham/tui-da-cho-nu/")).toBe(
      "trang:/san-pham/tui-da-cho-nu/",
    );
    expect(khoaDong("/")).toBe("trang:/");
  });
});

describe("gomChieu", () => {
  it("cộng lượt theo từng nguồn cho mỗi dòng", () => {
    const m = gomChieu([
      { path: "/cua-hang/vi-da-nam/", nhom: "google_organic", luot: 30 },
      { path: "/cua-hang/vi-da-nam/", nhom: "google_ads", luot: 12 },
      { path: "/cua-hang/vi-da-nam/", nhom: "direct", luot: 5 },
      { path: "/sua-tui-lv/", nhom: "facebook", luot: 8 },
    ]);
    expect(m.get("san-pham:vi-da-nam")).toEqual({
      google_organic: 30,
      google_ads: 12,
      direct: 5,
    });
    expect(m.get("trang-goc:sua-tui-lv")).toEqual({ facebook: 8 });
  });

  it("gộp bản Việt + bản Anh của cùng sản phẩm vào một dòng", () => {
    const m = gomChieu([
      { path: "/cua-hang/x/", nhom: "google_organic", luot: 30 },
      { path: "/en/shop/x/", nhom: "google_organic", luot: 4 },
    ]);
    expect(m.get("san-pham:x")).toEqual({ google_organic: 34 });
  });

  it("gộp cả biến thể thiếu gạch chéo cuối", () => {
    const m = gomChieu([
      { path: "/blog/", nhom: "direct", luot: 10 },
      { path: "/blog", nhom: "direct", luot: 2 },
    ]);
    expect(m.get("trang-goc:blog")).toEqual({ direct: 12 });
  });

  it("tổng các nguồn của một dòng bằng tổng lượt của dòng đó", () => {
    // Bất biến quan trọng nhất: bảng in "47 lượt" mà tooltip cộng ra 52 thì
    // A Khoa mất tin vào cả màn hình.
    const dong = [
      { path: "/cua-hang/x/", nhom: "google_organic", luot: 30 },
      { path: "/en/shop/x/", nhom: "google_ads", luot: 12 },
      { path: "/cua-hang/x/", nhom: "direct", luot: 5 },
    ];
    const m = gomChieu(dong);
    const tongChieu = Object.values(m.get("san-pham:x")!).reduce(
      (a, b) => a + b,
      0,
    );
    expect(tongChieu).toBe(dong.reduce((t, d) => t + d.luot, 0));
  });

  it("bỏ qua dòng thiếu nhóm, không đẻ khoá rỗng", () => {
    const m = gomChieu([{ path: "/cua-hang/x/", nhom: "", luot: 9 }]);
    expect(m.size).toBe(0);
  });
});

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
