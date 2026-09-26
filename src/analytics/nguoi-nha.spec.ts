import {
  DemNguoiNha,
  chuanHoaIp,
  khoaNguoiNha,
  mocNgayVN,
  ngayVNCua,
} from "./nguoi-nha";

describe("chuanHoaIp", () => {
  it("giữ IPv4 / IPv6 hợp lệ, bỏ khoảng trắng và hạ chữ thường", () => {
    expect(chuanHoaIp(" 1.2.3.4 ")).toBe("1.2.3.4");
    expect(chuanHoaIp("2001:DB8::1")).toBe("2001:db8::1");
  });

  it("IPv4 bọc trong IPv6 quy về IPv4 — cùng người không ra hai khoá", () => {
    expect(chuanHoaIp("::ffff:1.2.3.4")).toBe("1.2.3.4");
  });

  it("rác thì trả null", () => {
    expect(chuanHoaIp("unknown")).toBeNull();
    expect(chuanHoaIp("1.2.3.4, 5.6.7.8")).toBeNull();
    expect(chuanHoaIp(undefined)).toBeNull();
    expect(chuanHoaIp(1234)).toBeNull();
  });
});

describe("ngày lịch Việt Nam", () => {
  it("23:30 giờ ta vẫn là hôm đó, 00:30 giờ ta đã sang hôm sau", () => {
    // 23:30 VN ngày 26/09 = 16:30 UTC ngày 26/09
    expect(ngayVNCua(new Date(Date.UTC(2026, 8, 26, 16, 30)))).toBe(
      "2026-09-26",
    );
    // 00:30 VN ngày 27/09 = 17:30 UTC ngày 26/09
    expect(ngayVNCua(new Date(Date.UTC(2026, 8, 26, 17, 30)))).toBe(
      "2026-09-27",
    );
  });

  it("mốc ngày là [00:00, 24:00) giờ ta", () => {
    const { tu, den } = mocNgayVN("2026-09-26");
    expect(tu.toISOString()).toBe("2026-09-25T17:00:00.000Z");
    expect(den.toISOString()).toBe("2026-09-26T17:00:00.000Z");
    expect(ngayVNCua(tu)).toBe("2026-09-26");
    expect(ngayVNCua(new Date(+den - 1))).toBe("2026-09-26");
  });
});

describe("DemNguoiNha", () => {
  const k = khoaNguoiNha("1.2.3.4", "2026-09-26");

  it("chưa hỏi thì chưa biết", () => {
    expect(new DemNguoiNha().doc(k, 0)).toBeUndefined();
  });

  it("'không' chỉ giữ ngắn — vừa đăng nhập ở chỗ khác là sớm biết", () => {
    const d = new DemNguoiNha(15_000);
    d.ghi(k, false, 1_000, 999_999);
    expect(d.doc(k, 10_000)).toBe(false);
    expect(d.doc(k, 16_001)).toBeUndefined();
  });

  it("'có' giữ tới hết ngày", () => {
    const d = new DemNguoiNha(15_000);
    d.ghi(k, true, 1_000, 500_000);
    expect(d.doc(k, 499_999)).toBe(true);
    expect(d.doc(k, 500_000)).toBeUndefined();
  });

  it("đầy thì xoá sạch chứ không phình vô hạn", () => {
    const d = new DemNguoiNha(15_000, 2);
    d.ghi("a", true, 0, 9e9);
    d.ghi("b", true, 0, 9e9);
    d.ghi("c", true, 0, 9e9);
    expect(d.doc("a", 1)).toBeUndefined();
    expect(d.doc("c", 1)).toBe(true);
  });
});
