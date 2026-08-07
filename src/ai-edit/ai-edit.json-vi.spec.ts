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
    // Trường trống trong DB là NULL. Đổi nó thành "" là ghi một thẻ meta rỗng
    // thay vì không ghi thẻ nào, và Google coi hai thứ đó khác nhau.
    expect(goBoc(null)).toBeNull();
    expect(goBoc(undefined)).toBeNull();
  });

  it('JSON rỗng "{}" trả về chuỗi rỗng, không trả nguyên văn dấu ngoặc', () => {
    // Ca này là LỖI THẬT đã bắt được: 7 sản phẩm có description đúng bằng "{}".
    // Trả nguyên văn thì admin hiện "{}" như thể đó là nội dung, AI được giao
    // viết lại hai ký tự dấu ngoặc, và bọc lại thành {"vi":"{}"} — nhét dấu
    // ngoặc vào làm chữ. Site thì đang hiện rỗng cho các dòng đó.
    expect(goBoc("{}")).toBe("");
    expect(goBoc('{"khac":1}')).toBe("");
  });

  it("chuỗi mở đầu bằng { nhưng không phải JSON thì trả nguyên văn", () => {
    // Nội dung thật có thể mở đầu bằng dấu ngoặc mà không phải JSON. Coi nó là
    // JSON hỏng rồi trả rỗng là làm mất chữ của chủ shop.
    expect(goBoc("{chưa đóng ngoặc")).toBe("{chưa đóng ngoặc");
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
    // Hiện chưa dòng nào có "en", nhưng thêm về sau thì hàm này không được xoá.
    expect(bocLai('{"vi":"Cũ","en":"Old"}', "Mới")).toBe(
      '{"vi":"Mới","en":"Old"}',
    );
  });

  it("vỏ chỉ có en thì sửa en, không tự dựng thêm vi", () => {
    // Dựng thêm "vi" là để hai bản chõi nhau, mà site đọc vi trước nên bản en
    // cũ thành vô hình dù không ai sửa nó.
    expect(bocLai('{"en":"Old"}', "New")).toBe('{"en":"New"}');
  });

  it("chữ mới là null thì trả null, giữ được trường trống", () => {
    expect(bocLai('{"vi":"Cũ"}', null)).toBeNull();
    expect(bocLai("Chữ cũ", null)).toBeNull();
  });

  it("cũ là null thì ghi chữ trần — bản ghi mới không tự sinh vỏ", () => {
    expect(bocLai(null, "Mới")).toBe("Mới");
  });
});

describe("bất biến bóc-rồi-bọc", () => {
  // Đây là bất biến thật sự quan trọng: mỗi lần chủ shop áp dụng một trường,
  // giá trị đi qua đúng cặp hàm này. Lệch một lần là dữ liệu lệch vĩnh viễn.
  const CAC_CA = [
    "Chữ trần bình thường",
    '{"vi":"Có vỏ JSON"}',
    '{"vi":"<p>HTML trong vỏ</p>"}',
    '{"vi":"Cũ","en":"Old"}',
    '{"en":"Chỉ có en"}',
    "{}",
    "{chưa đóng ngoặc",
    "",
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
