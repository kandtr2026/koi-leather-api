import { sapAnhChinh, xepThuTu, type AnhThuTu } from "./anh-chinh";

/** Áp danh sách cập nhật lên bản sao — để kiểm TRẠNG THÁI CUỐI chứ không chỉ các dòng đổi. */
function ap(anh: AnhThuTu[], doi: ReturnType<typeof sapAnhChinh>): AnhThuTu[] {
  const m = new Map(doi.map((d) => [d.id, d]));
  return xepThuTu(anh.map((a) => ({ ...a, ...(m.get(a.id) ?? {}) })));
}

/** Bất biến phải luôn đúng sau mọi thao tác. */
function batBien(anh: AnhThuTu[]) {
  const x = xepThuTu(anh);
  expect(x.filter((a) => a.isPrimary)).toHaveLength(1);
  expect(x[0].isPrimary).toBe(true);
  expect(x.map((a) => a.displayOrder)).toEqual(x.map((_, k) => k));
}

const mau = (): AnhThuTu[] => [
  { id: "a", displayOrder: 0, isPrimary: true },
  { id: "b", displayOrder: 1, isPrimary: false },
  { id: "c", displayOrder: 2, isPrimary: false },
  { id: "d", displayOrder: 3, isPrimary: false },
];

describe("sapAnhChinh — đặt bìa", () => {
  it("tấm được chọn lên đầu mang cờ, các tấm khác giữ trình tự cũ", () => {
    const sau = ap(mau(), sapAnhChinh(mau(), { chon: "c" }));
    expect(sau.map((a) => a.id)).toEqual(["c", "a", "b", "d"]);
    batBien(sau);
  });

  it("đặt bìa đúng tấm đã là bìa thì không ghi gì", () => {
    expect(sapAnhChinh(mau(), { chon: "a" })).toEqual([]);
  });

  it("chỉ ghi những tấm thật sự đổi", () => {
    // c lên đầu: c, a, b đổi vị trí; d vẫn ở 3 → không ghi.
    expect(
      sapAnhChinh(mau(), { chon: "c" })
        .map((d) => d.id)
        .sort(),
    ).toEqual(["a", "b", "c"]);
  });

  it("id lạ (không thuộc sản phẩm) không làm mất ảnh chính", () => {
    const sau = ap(mau(), sapAnhChinh(mau(), { chon: "zzz" }));
    expect(sau[0].id).toBe("a");
    batBien(sau);
  });
});

describe("sapAnhChinh — sắp thứ tự", () => {
  it("tấm đứng đầu sau khi sắp lại trở thành ảnh chính", () => {
    // Người dùng bấm ← đưa b lên đầu: b=0, a=1; cờ vẫn còn ở a.
    const vuaSap: AnhThuTu[] = [
      { id: "a", displayOrder: 1, isPrimary: true },
      { id: "b", displayOrder: 0, isPrimary: false },
      { id: "c", displayOrder: 2, isPrimary: false },
    ];
    const sau = ap(vuaSap, sapAnhChinh(vuaSap, { uuTien: "dau" }));
    expect(sau.map((a) => a.id)).toEqual(["b", "a", "c"]);
    batBien(sau);
  });
});

describe("sapAnhChinh — tải ảnh lên / xoá ảnh", () => {
  it("tải ảnh thường: giữ bìa cũ, tấm mới nằm cuối", () => {
    const them = [...mau(), { id: "e", displayOrder: 4, isPrimary: false }];
    expect(sapAnhChinh(them, { uuTien: "co-san" })).toEqual([]);
  });

  it("tải ảnh có tick 'ảnh chính': tấm mới lên đầu chứ không nằm cuối", () => {
    const them = [...mau(), { id: "e", displayOrder: 4, isPrimary: false }];
    const sau = ap(them, sapAnhChinh(them, { chon: "e" }));
    expect(sau.map((a) => a.id)).toEqual(["e", "a", "b", "c", "d"]);
    batBien(sau);
  });

  it("tấm đầu tiên của sản phẩm chưa có ảnh nào tự thành ảnh chính", () => {
    const sau = ap(
      [{ id: "x", displayOrder: 0, isPrimary: false }],
      sapAnhChinh([{ id: "x", displayOrder: 0, isPrimary: false }], {
        uuTien: "co-san",
      }),
    );
    batBien(sau);
  });

  it("xoá đúng tấm bìa: tấm kế tiếp thành bìa, thứ tự liền lại từ 0", () => {
    const conLai = mau().filter((a) => a.id !== "a");
    const sau = ap(conLai, sapAnhChinh(conLai, { uuTien: "co-san" }));
    expect(sau.map((a) => a.id)).toEqual(["b", "c", "d"]);
    batBien(sau);
  });

  it("dữ liệu cũ lệch (cờ ở tấm giữa): 'co-san' đưa đúng tấm mang cờ lên đầu", () => {
    const lech: AnhThuTu[] = [
      { id: "a", displayOrder: 0, isPrimary: false },
      { id: "b", displayOrder: 1, isPrimary: true },
      { id: "c", displayOrder: 2, isPrimary: false },
    ];
    const sau = ap(lech, sapAnhChinh(lech, { uuTien: "co-san" }));
    expect(sau.map((a) => a.id)).toEqual(["b", "a", "c"]);
    batBien(sau);
  });

  it("hai tấm cùng mang cờ (dữ liệu hỏng): chỉ còn một", () => {
    const hong: AnhThuTu[] = [
      { id: "a", displayOrder: 0, isPrimary: true },
      { id: "b", displayOrder: 1, isPrimary: true },
    ];
    batBien(ap(hong, sapAnhChinh(hong, { uuTien: "co-san" })));
  });

  it("thứ tự trùng nhau: hoà thì tấm tạo trước đứng trước, không nhảy ngẫu nhiên", () => {
    const trung: AnhThuTu[] = [
      { id: "b", displayOrder: 0, isPrimary: false, createdAt: "2026-09-02" },
      { id: "a", displayOrder: 0, isPrimary: false, createdAt: "2026-09-01" },
    ];
    const sau = ap(trung, sapAnhChinh(trung, { uuTien: "co-san" }));
    expect(sau.map((a) => a.id)).toEqual(["a", "b"]);
    batBien(sau);
  });

  it("sản phẩm không còn ảnh nào thì không làm gì", () => {
    expect(sapAnhChinh([], { uuTien: "co-san" })).toEqual([]);
  });
});
