import {
  chuoiNgayVN,
  dauTuan,
  donViCot,
  dungCot,
  type DongCotTho,
} from "./bieu-do-nguon";

describe("donViCot", () => {
  it("1 ngày vẽ theo giờ, tới 90 ngày theo ngày, trên nữa theo tuần", () => {
    expect(donViCot(1)).toBe("gio");
    expect(donViCot(7)).toBe("ngay");
    expect(donViCot(90)).toBe("ngay");
    expect(donViCot(91)).toBe("tuan");
    expect(donViCot(365)).toBe("tuan");
  });
});

describe("chuoiNgayVN", () => {
  it("cắt theo lịch Việt Nam, không lùi một ngày như toISOString() trần", () => {
    // 00:00 giờ ta ngày 24/09 = 17:00 UTC ngày 23/09.
    const tu = new Date(Date.UTC(2026, 8, 24) - 7 * 3_600_000);
    expect(chuoiNgayVN(tu, 3)).toEqual([
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
    ]);
  });

  it("qua ranh giới tháng vẫn liền mạch", () => {
    const tu = new Date(Date.UTC(2026, 7, 30) - 7 * 3_600_000);
    expect(chuoiNgayVN(tu, 4)).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
    ]);
  });
});

describe("dauTuan", () => {
  it("về đúng thứ Hai, kể cả khi chính ngày đó là Chủ Nhật", () => {
    expect(dauTuan("2026-09-26")).toBe("2026-09-21"); // thứ Bảy
    expect(dauTuan("2026-09-21")).toBe("2026-09-21"); // thứ Hai giữ nguyên
    expect(dauTuan("2026-09-27")).toBe("2026-09-21"); // Chủ Nhật thuộc tuần trước
    expect(dauTuan("2026-09-01")).toBe("2026-08-31"); // lùi qua tháng
  });
});

describe("dungCot — theo giờ", () => {
  const dong: DongCotTho[] = [
    { moc: "09", nguon: "google_organic", luot: 5 },
    { moc: "09", nguon: "facebook", luot: 2 },
    { moc: "14", nguon: "google_ads", luot: 3 },
  ];

  it("luôn đủ 24 cột, giờ không ai vào vẫn có mặt với tổng 0", () => {
    const { cot } = dungCot({
      don: "gio",
      dong,
      ngay: ["2026-09-26"],
      gioHienTai: null,
      batDauDo: null,
    });
    expect(cot).toHaveLength(24);
    expect(cot[9]).toMatchObject({
      moc: "9",
      tong: 7,
      nguon: { google_organic: 5, facebook: 2 },
    });
    expect(cot[14].tong).toBe(3);
    expect(cot[0]).toMatchObject({ tong: 0, nguon: {} });
  });

  it("hôm nay: giờ chưa tới đánh dấu daQua=false, không lẫn với giờ không có khách", () => {
    const { cot } = dungCot({
      don: "gio",
      dong,
      ngay: ["2026-09-26"],
      gioHienTai: 14,
      batDauDo: null,
    });
    expect(cot[14].daQua).toBe(true);
    expect(cot[15].daQua).toBe(false);
    expect(cot[23].daQua).toBe(false);
  });

  it("hôm qua (gioHienTai = null): cả 24 giờ đều đã qua", () => {
    const { cot } = dungCot({
      don: "gio",
      dong,
      ngay: ["2026-09-25"],
      gioHienTai: null,
      batDauDo: null,
    });
    expect(cot.every((c) => c.daQua)).toBe(true);
  });

  it("cột giờ không bao giờ bị cắt theo mốc bắt đầu đo", () => {
    const { cot, daCatDau } = dungCot({
      don: "gio",
      dong,
      ngay: ["2026-09-26"],
      gioHienTai: null,
      batDauDo: "2026-09-27",
    });
    expect(cot).toHaveLength(24);
    expect(daCatDau).toBe(false);
  });

  it("giờ rác bị bỏ chứ không nhét vào cột sai", () => {
    const { cot } = dungCot({
      don: "gio",
      dong: [
        { moc: "24", nguon: "direct", luot: 9 },
        { moc: "x", nguon: "direct", luot: 9 },
      ],
      ngay: ["2026-09-26"],
      gioHienTai: null,
      batDauDo: null,
    });
    expect(cot.reduce((t, c) => t + c.tong, 0)).toBe(0);
  });
});

describe("dungCot — theo ngày", () => {
  const ngay = ["2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04"];

  it("điền 0 cho ngày trống, tổng cột khớp tổng các dòng", () => {
    const dong: DongCotTho[] = [
      { moc: "2026-08-02", nguon: "direct", luot: 4 },
      { moc: "2026-08-04", nguon: "direct", luot: 1 },
      { moc: "2026-08-04", nguon: "google_organic", luot: 6 },
    ];
    const { cot, daCatDau } = dungCot({
      don: "ngay",
      dong,
      ngay,
      gioHienTai: null,
      batDauDo: null,
    });
    expect(cot.map((c) => c.tong)).toEqual([0, 4, 0, 7]);
    expect(daCatDau).toBe(false);
    expect(cot[3]).toMatchObject({ tu: "2026-08-04", den: "2026-08-04" });
  });

  it("cắt những ngày trước khi bắt đầu đo và báo lại cho người gọi", () => {
    const { cot, daCatDau } = dungCot({
      don: "ngay",
      dong: [{ moc: "2026-08-03", nguon: "direct", luot: 2 }],
      ngay,
      gioHienTai: null,
      batDauDo: "2026-08-03",
    });
    expect(cot.map((c) => c.moc)).toEqual(["2026-08-03", "2026-08-04"]);
    expect(daCatDau).toBe(true);
  });

  it("mốc đo nằm trước cả khoảng thì không cắt gì", () => {
    const { cot, daCatDau } = dungCot({
      don: "ngay",
      dong: [],
      ngay,
      gioHienTai: null,
      batDauDo: "2026-07-01",
    });
    expect(cot).toHaveLength(4);
    expect(daCatDau).toBe(false);
  });

  it("dòng rơi ngoài khoảng bị bỏ, không cộng lấn sang cột khác", () => {
    const { cot } = dungCot({
      don: "ngay",
      dong: [{ moc: "2026-07-31", nguon: "direct", luot: 50 }],
      ngay,
      gioHienTai: null,
      batDauDo: null,
    });
    expect(cot.reduce((t, c) => t + c.tong, 0)).toBe(0);
  });
});

describe("dungCot — theo tuần", () => {
  // Thứ Tư 16/09 tới thứ Bảy 26/09: tuần đầu hụt (bắt đầu giữa tuần), tuần
  // giữa đủ, tuần cuối hụt (mới tới thứ Bảy).
  const tu = new Date(Date.UTC(2026, 8, 16) - 7 * 3_600_000);
  const ngay = chuoiNgayVN(tu, 11);

  it("gom ngày về tuần bắt đầu thứ Hai, cột đầu/cuối ghi đúng phần ngày phủ", () => {
    const dong: DongCotTho[] = [
      { moc: "2026-09-16", nguon: "direct", luot: 1 },
      { moc: "2026-09-20", nguon: "direct", luot: 2 }, // Chủ Nhật — vẫn tuần 14/09
      { moc: "2026-09-21", nguon: "facebook", luot: 3 },
      { moc: "2026-09-26", nguon: "facebook", luot: 4 },
    ];
    const { cot } = dungCot({
      don: "tuan",
      dong,
      ngay,
      gioHienTai: null,
      batDauDo: null,
    });
    expect(cot.map((c) => [c.moc, c.tu, c.den, c.tong])).toEqual([
      ["2026-09-14", "2026-09-16", "2026-09-20", 3],
      ["2026-09-21", "2026-09-21", "2026-09-26", 7],
    ]);
  });

  it("mốc đo rơi giữa tuần: cột tuần đó chỉ phủ từ ngày bắt đầu đo", () => {
    const { cot, daCatDau } = dungCot({
      don: "tuan",
      dong: [{ moc: "2026-09-17", nguon: "direct", luot: 5 }],
      ngay,
      gioHienTai: null,
      batDauDo: "2026-09-18",
    });
    expect(daCatDau).toBe(true);
    expect(cot[0]).toMatchObject({
      moc: "2026-09-14",
      tu: "2026-09-18",
      tong: 0,
    });
  });
});
