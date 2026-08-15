import { bocLai, goBoc } from "./ai-edit.json-vi";

/**
 * Lớp vỏ JSON của koi_products là chỗ dễ làm lệch dữ liệu nhất của cả module:
 * `name` và `description` lưu dạng {"vi":"..."} (336/336 dòng trên dữ liệu thật),
 * còn metaTitle/metaDescription và mọi bảng khác lưu chữ trần.
 *
 * Bất biến phải giữ: bóc ra rồi bọc lại thì THỨ SITE HIỆN RA không đổi. Đã chạy
 * trên 2301 trường thật của cả 6 bảng — 0 trường lệch nghĩa. Các test dưới chốt
 * lại đúng bất biến đó cùng những ca đã thực sự làm nó sai.
 */
describe("goBoc", () => {
  it("chữ trần đi qua không đổi", () => {
    expect(goBoc("Ví da thủ công")).toBe("Ví da thủ công");
  });

  it("bóc đúng bản tiếng Việt khỏi vỏ JSON", () => {
    expect(goBoc('{"vi":"Túi LOOM – Túi xách Da bò Ý"}')).toBe(
      "Túi LOOM – Túi xách Da bò Ý",
    );
  });

  it("vỏ có cả en thì ưu tiên vi — đúng thứ tự của shop.service.ts", () => {
    expect(goBoc('{"vi":"Ví da","en":"Wallet"}')).toBe("Ví da");
  });

  it("vỏ chỉ có en thì lấy en", () => {
    expect(goBoc('{"en":"Wallet"}')).toBe("Wallet");
  });

  it("null vẫn là null, KHÔNG thành chuỗi rỗng", () => {
    expect(goBoc(null)).toBeNull();
    expect(goBoc(undefined)).toBeNull();
  });

  it('JSON rỗng "{}" trả về chuỗi rỗng, không trả nguyên văn dấu ngoặc', () => {
    expect(goBoc("{}")).toBe("");
    expect(goBoc('{"khac":1}')).toBe("");
  });

  it("chuỗi mở đầu bằng { nhưng không phải JSON thì trả nguyên văn", () => {
    expect(goBoc("{chưa đóng ngoặc")).toBe("{chưa đóng ngoặc");
  });

  // === Dạng OBJECT — đúng thứ PrismaService trả về ===
  // LỖI ĐÃ LÊN PRODUCTION: middleware $use trong prisma.service.ts:58 parse sẵn
  // KoiProduct.name/.description thành object. Bản cũ ép String() ra
  // "[object Object]" — trang sửa hiện sai, và bocLai() sau đó ghi chữ trần vào
  // cột JSON vì không nhận ra vỏ. Test cũ không bắt được vì chỉ truyền chuỗi.
  it("object do middleware: lấy đúng chữ vi, KHÔNG ra [object Object]", () => {
    expect(goBoc({ vi: "Túi LOOM – Túi xách Da bò Ý" })).toBe(
      "Túi LOOM – Túi xách Da bò Ý",
    );
  });

  it("object: ưu tiên vi trước en", () => {
    expect(goBoc({ vi: "Ví da", en: "Wallet" })).toBe("Ví da");
  });

  it("object chỉ có en thì lấy en", () => {
    expect(goBoc({ en: "Wallet" })).toBe("Wallet");
  });

  it("object rỗng trả chuỗi rỗng — nhất quán với chuỗi {}", () => {
    expect(goBoc({})).toBe("");
    expect(goBoc({ khac: 1 })).toBe("");
  });

  it("không bao giờ trả về chuỗi [object Object]", () => {
    for (const v of [
      { vi: "x" },
      { en: "y" },
      {},
      { khac: 1 },
      { vi: "<p>html</p>" },
    ]) {
      expect(goBoc(v)).not.toContain("[object Object]");
    }
  });
});

describe("bocLai", () => {
  it("chữ trần thì ghi thẳng, không tự thêm vỏ", () => {
    expect(bocLai("Chữ cũ", "Chữ mới")).toBe("Chữ mới");
  });

  it("giữ nguyên hình vỏ JSON của giá trị cũ", () => {
    expect(bocLai('{"vi":"Cũ"}', "Mới")).toBe('{"vi":"Mới"}');
  });

  it("KHÔNG làm mất các khoá khác trong vỏ", () => {
    expect(bocLai('{"vi":"Cũ","en":"Old"}', "Mới")).toBe(
      '{"vi":"Mới","en":"Old"}',
    );
  });

  it("vỏ chỉ có en thì sửa en, không tự dựng thêm vi", () => {
    expect(bocLai('{"en":"Old"}', "New")).toBe('{"en":"New"}');
  });

  it("chữ mới là null thì trả null, giữ được trường trống", () => {
    expect(bocLai('{"vi":"Cũ"}', null)).toBeNull();
    expect(bocLai("Chữ cũ", null)).toBeNull();
  });

  it("cũ là null thì ghi chữ trần — bản ghi mới không tự sinh vỏ", () => {
    expect(bocLai(null, "Mới")).toBe("Mới");
  });

  // === Dạng OBJECT (middleware PrismaService) ===
  it("cũ là object: ghi ra CHUỖI JSON, không ghi chữ trần", () => {
    // Nếu ghi chữ trần vào cột đang là JSON thì dòng đó khác hình 335 dòng còn lại.
    expect(bocLai({ vi: "Cũ" }, "Mới")).toBe('{"vi":"Mới"}');
  });

  it("object: giữ khoá khác", () => {
    expect(bocLai({ vi: "Cũ", en: "Old" }, "Mới")).toBe(
      '{"vi":"Mới","en":"Old"}',
    );
  });

  it("object chỉ có en thì sửa en", () => {
    expect(bocLai({ en: "Old" }, "New")).toBe('{"en":"New"}');
  });

  it("object rỗng thì dựng khoá vi", () => {
    expect(bocLai({}, "Mới")).toBe('{"vi":"Mới"}');
  });
});

describe("bất biến bóc-rồi-bọc", () => {
  const CAC_CA: unknown[] = [
    "Chữ trần bình thường",
    '{"vi":"Có vỏ JSON"}',
    '{"vi":"<p>HTML trong vỏ</p>"}',
    '{"vi":"Cũ","en":"Old"}',
    '{"en":"Chỉ có en"}',
    "{}",
    "{chưa đóng ngoặc",
    "",
    // Dạng object — đúng thứ mà product.name/.description đi qua.
    { vi: "Có vỏ JSON" },
    { vi: "<p>HTML trong vỏ</p>" },
    { vi: "Cũ", en: "Old" },
    { en: "Chỉ có en" },
    {},
  ];

  it.each(CAC_CA)("giữ nguyên thứ site hiện ra: %j", (cu) => {
    const lai = bocLai(cu, goBoc(cu));
    expect(goBoc(lai)).toBe(goBoc(cu));
  });

  it("ghi chữ mới rồi đọc lại thì ra đúng chữ mới, ở mọi hình", () => {
    for (const cu of CAC_CA) {
      expect(goBoc(bocLai(cu, "CHỮ MỚI"))).toBe("CHỮ MỚI");
    }
  });
});
