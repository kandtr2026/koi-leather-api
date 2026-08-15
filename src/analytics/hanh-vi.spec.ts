/**
 * Cac ham gom so hanh vi khach — test hanh vi that, khong can co so du lieu.
 *
 * Vi sao can test: phan cat phien va bo buoc trung lap la cho de sai nhat trong
 * ca tinh nang, ma sai thi KHONG bao loi — chi ra mot con so tron tru nhung
 * lech, roi chu shop dua vao do quyet dinh chi tien quang cao.
 *
 * Ranh gioi 30 phut phai chot bang test: hop dong noi ro cach 30 phut chan la
 * CUNG phien. Doi ">" thanh ">=" la so phien nhay len im lang.
 */
import {
  KHOANG_CAT_PHIEN_MS,
  boTrungLapLienTiep,
  catPhien,
  gomBuocTu,
  gomDuongDi,
  gomHanhVi,
  gomNguon,
  gomNhiet,
  gomPheuBuoc,
  gomSoNgayThu,
  gomTheoGio,
  type LuotTho,
} from "./hanh-vi";

const PHUT = 60 * 1000;

/** Moc goc de tinh thoi gian trong test: 2026-08-03 09:00 gio VN. */
const GOC = Date.UTC(2026, 7, 3, 2, 0, 0);

/**
 * Dung mot luot xem tho.
 *
 * `phutSauGoc` cho phep dat thoi diem tuong doi, khoi phai viet Date dai dong.
 * ngay/gio/thu de mac dinh vi phan lon test khong quan tam — cac test ve gio va
 * nhiet thi truyen thang.
 */
function luot(p: Partial<LuotTho> & { phutSauGoc?: number } = {}): LuotTho {
  const luc = p.luc ?? GOC + (p.phutSauGoc ?? 0) * PHUT;
  return {
    visitorHash: p.visitorHash ?? "khach-a",
    path: p.path ?? "/",
    source: p.source ?? "google",
    luc,
    ngay: p.ngay ?? "2026-08-03",
    gio: p.gio ?? 9,
    thu: p.thu ?? 1,
  };
}

describe("boTrungLapLienTiep", () => {
  it("gop cac buoc trung lap KE NHAU thanh mot", () => {
    expect(boTrungLapLienTiep(["/a", "/a", "/a", "/b"])).toEqual(["/a", "/b"]);
  });

  it("GIU trang quay lai khi khong ke nhau — do la buoc that", () => {
    // Day la cho de sai nhat: dedupe kieu Set se an mat buoc quay ve "/",
    // lam bang "duong di nguyen ven" khong bao gio hien duong vong.
    expect(boTrungLapLienTiep(["/", "/a", "/"])).toEqual(["/", "/a", "/"]);
  });

  it("mang rong ra mang rong, khong no", () => {
    expect(boTrungLapLienTiep([])).toEqual([]);
  });
});

describe("catPhien — ranh gioi 30 phut", () => {
  it("cach DUNG 30 phut van la MOT phien", () => {
    const p = catPhien([
      luot({ phutSauGoc: 0, path: "/" }),
      luot({ phutSauGoc: 30, path: "/a" }),
    ]);
    expect(p).toHaveLength(1);
    expect(p[0].buoc).toEqual(["/", "/a"]);
    expect(p[0].luot).toBe(2);
  });

  it("cach hon 30 phut mot chut la HAI phien", () => {
    const p = catPhien([
      luot({ phutSauGoc: 0, path: "/" }),
      luot({ phutSauGoc: 30.5, path: "/a" }),
    ]);
    expect(p).toHaveLength(2);
    expect(p[0].buoc).toEqual(["/"]);
    expect(p[1].buoc).toEqual(["/a"]);
  });

  it("cat dung CHO: chuoi dai bi cat tai dung khoang trong", () => {
    // 0, 10, 20 phut lien nhau -> phien 1. Nhay sang 90 -> phien 2 (2 buoc).
    const p = catPhien([
      luot({ phutSauGoc: 0, path: "/" }),
      luot({ phutSauGoc: 10, path: "/a" }),
      luot({ phutSauGoc: 20, path: "/b" }),
      luot({ phutSauGoc: 90, path: "/c" }),
      luot({ phutSauGoc: 100, path: "/d" }),
    ]);
    expect(p).toHaveLength(2);
    expect(p[0].buoc).toEqual(["/", "/a", "/b"]);
    expect(p[1].buoc).toEqual(["/c", "/d"]);
  });

  it("nguong cat dung la 30 phut, khong phai con so khac", () => {
    expect(KHOANG_CAT_PHIEN_MS).toBe(30 * 60 * 1000);
  });

  it("hai khach khac nhau khong bao gio gop chung phien", () => {
    const p = catPhien([
      luot({ visitorHash: "khach-a", phutSauGoc: 0 }),
      luot({ visitorHash: "khach-b", phutSauGoc: 1 }),
    ]);
    expect(p).toHaveLength(2);
  });

  it("cung khach nhung khac ngay lich thi tach phien, du gan nhau", () => {
    // Hash doi moi nua dem nen trong thuc te khong the cung hash khac ngay,
    // nhung ham phai giu luat de khong bao gio noi hai ngay lam mot.
    const p = catPhien([
      luot({ ngay: "2026-08-03", phutSauGoc: 0 }),
      luot({ ngay: "2026-08-04", phutSauGoc: 5 }),
    ]);
    expect(p).toHaveLength(2);
  });

  it("bo buoc trung lap trong phien, nhung luot van dem du", () => {
    const p = catPhien([
      luot({ phutSauGoc: 0, path: "/cua-hang/" }),
      luot({ phutSauGoc: 1, path: "/cua-hang/" }),
      luot({ phutSauGoc: 2, path: "/cua-hang/" }),
    ]);
    expect(p).toHaveLength(1);
    expect(p[0].buoc).toEqual(["/cua-hang/"]);
    // luot giu nguyen 3: bo trung lap la viec cua DUONG DI, khong duoc lam hut
    // so luot xem that.
    expect(p[0].luot).toBe(3);
  });

  it("nguon lay tu luot DAU phien, khong phai luot sau", () => {
    const p = catPhien([
      luot({ phutSauGoc: 0, source: "facebook", path: "/" }),
      luot({ phutSauGoc: 5, source: "internal", path: "/a" }),
    ]);
    expect(p[0].nguon).toBe("facebook");
  });

  it("mang vao khong theo thu tu thoi gian van cat dung", () => {
    const p = catPhien([
      luot({ phutSauGoc: 90, path: "/c" }),
      luot({ phutSauGoc: 0, path: "/a" }),
      luot({ phutSauGoc: 10, path: "/b" }),
    ]);
    expect(p).toHaveLength(2);
    expect(p[0].buoc).toEqual(["/a", "/b"]);
    expect(p[1].buoc).toEqual(["/c"]);
  });

  it("khong co du lieu thi ra mang rong", () => {
    expect(catPhien([])).toEqual([]);
  });
});

describe("gomTheoGio", () => {
  it("luon DUNG 24 dong, gio 0..23 tang dan", () => {
    const g = gomTheoGio([luot({ gio: 9 })]);
    expect(g).toHaveLength(24);
    expect(g.map((x) => x.gio)).toEqual(Array.from({ length: 24 }, (_, i) => i));
  });

  it("gio khong co ai vao van co dong voi luot 0", () => {
    const g = gomTheoGio([luot({ gio: 9 })]);
    expect(g[9]).toEqual({ gio: 9, luot: 1, khach: 1 });
    expect(g[0]).toEqual({ gio: 0, luot: 0, khach: 0 });
    expect(g[23]).toEqual({ gio: 23, luot: 0, khach: 0 });
  });

  it("khach dem theo hash rieng, khong dem bang so luot", () => {
    const g = gomTheoGio([
      luot({ gio: 9, visitorHash: "a" }),
      luot({ gio: 9, visitorHash: "a" }),
      luot({ gio: 9, visitorHash: "b" }),
    ]);
    expect(g[9].luot).toBe(3);
    expect(g[9].khach).toBe(2);
  });

  it("khong co du lieu van ra 24 dong 0", () => {
    const g = gomTheoGio([]);
    expect(g).toHaveLength(24);
    expect(g.every((x) => x.luot === 0 && x.khach === 0)).toBe(true);
  });
});

describe("gomNhiet", () => {
  it("luon DUNG 168 o", () => {
    expect(gomNhiet([luot()])).toHaveLength(168);
    expect(gomNhiet([])).toHaveLength(168);
  });

  it("thu 0 la Chu Nhat va o dung vi tri thu*24+gio", () => {
    const n = gomNhiet([luot({ thu: 0, gio: 0 }), luot({ thu: 6, gio: 23 })]);
    expect(n[0]).toEqual({ thu: 0, gio: 0, luot: 1 });
    expect(n[167]).toEqual({ thu: 6, gio: 23, luot: 1 });
  });

  it("dien du o trong bang 0, khong bo qua", () => {
    const n = gomNhiet([luot({ thu: 1, gio: 9 })]);
    expect(n[1 * 24 + 9].luot).toBe(1);
    expect(n.filter((o) => o.luot === 0)).toHaveLength(167);
  });

  it("moi thu du 24 o — thieu o la panel lech cot im lang", () => {
    const n = gomNhiet([luot()]);
    for (let t = 0; t < 7; t++) {
      expect(n.filter((o) => o.thu === t)).toHaveLength(24);
    }
  });
});

describe("gomSoNgayThu", () => {
  it("ky 7 ngay: moi thu dung mot ngay", () => {
    const s = gomSoNgayThu("2026-08-03", 7);
    expect(s).toHaveLength(7);
    expect(s.every((x) => x.soNgay === 1)).toBe(true);
    // Tong phai bang so ngay cua ky.
    expect(s.reduce((a, x) => a + x.soNgay, 0)).toBe(7);
  });

  it("thu 0 la Chu Nhat, khop quy uoc dow cua Postgres", () => {
    // 2026-08-09 la Chu Nhat. Ky mot ngay do phai roi vao thu 0.
    const s = gomSoNgayThu("2026-08-09", 1);
    expect(s[0].soNgay).toBe(1);
    expect(s.reduce((a, x) => a + x.soNgay, 0)).toBe(1);
  });

  it("ky 30 ngay khong tron tuan: co thu 5 ngay, co thu 4 ngay", () => {
    const s = gomSoNgayThu("2026-07-11", 30);
    expect(s.reduce((a, x) => a + x.soNgay, 0)).toBe(30);
    expect(Math.max(...s.map((x) => x.soNgay))).toBe(5);
    expect(Math.min(...s.map((x) => x.soNgay))).toBe(4);
  });

  it("ky 90 ngay van du 7 dong va tong dung 90", () => {
    const s = gomSoNgayThu("2026-05-12", 90);
    expect(s).toHaveLength(7);
    expect(s.reduce((a, x) => a + x.soNgay, 0)).toBe(90);
  });

  it("chuoi ngay rac hay days = 0 thi ra 7 dong so 0, khong nem loi", () => {
    for (const xau of ["", "hom-nay", "2026-8-3", "abcd-ef-gh"]) {
      const s = gomSoNgayThu(xau, 7);
      expect(s).toHaveLength(7);
      expect(s.every((x) => x.soNgay === 0)).toBe(true);
    }
    expect(gomSoNgayThu("2026-08-03", 0).every((x) => x.soNgay === 0)).toBe(true);
  });
});

describe("gomPheuBuoc", () => {
  it("buoc 1 bang tong so phien; buoc sau khong bao gio lon hon buoc truoc", () => {
    const phien = [
      { nguon: "google", buoc: ["/"], luot: 1 },
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
      { nguon: "google", buoc: ["/", "/a", "/b"], luot: 3 },
    ];
    expect(gomPheuBuoc(phien)).toEqual([
      { buoc: 1, phien: 3 },
      { buoc: 2, phien: 2 },
      { buoc: 3, phien: 1 },
      { buoc: 4, phien: 0 },
    ]);
  });

  it("buoc 4 la '4 tro len' — phien 6 buoc van dem vao buoc 4", () => {
    const phien = [
      { nguon: "google", buoc: ["/", "/a", "/b", "/c", "/d", "/e"], luot: 6 },
    ];
    expect(gomPheuBuoc(phien)[3]).toEqual({ buoc: 4, phien: 1 });
  });

  it("khong co phien nao thi bon buoc deu 0, van du 4 dong", () => {
    const p = gomPheuBuoc([]);
    expect(p).toHaveLength(4);
    expect(p.every((x) => x.phien === 0)).toBe(true);
  });

  it("dem TRANG KHAC NHAU: quay lai trang cu khong day len bac sau", () => {
    // / -> /a -> / la 3 buoc nhung chi 2 trang. Nhan tren panel ghi "Xem 3
    // trang" nen phien nay PHAI dung o bac 2, khong duoc nam trong bac 3.
    const p = gomPheuBuoc([{ nguon: "google", buoc: ["/", "/a", "/"], luot: 3 }]);
    expect(p).toEqual([
      { buoc: 1, phien: 1 },
      { buoc: 2, phien: 1 },
      { buoc: 3, phien: 0 },
      { buoc: 4, phien: 0 },
    ]);
  });

  it("lat qua lat lai hai trang nhieu lan van chi la 2 trang", () => {
    const p = gomPheuBuoc([
      { nguon: "google", buoc: ["/", "/a", "/", "/a", "/"], luot: 5 },
    ]);
    expect(p[2].phien).toBe(0);
    expect(p[3].phien).toBe(0);
  });

  it("khop voi trangTB va phienSau trong cung phan hoi", () => {
    // Ba truong nay doc cung mot dinh nghia "trang khac nhau". Neu pheu dem do
    // dai duong thi bac 3 ra 1 trong khi trangTB in 2,00 — hai khoi trong CUNG
    // mot panel noi khac nhau ve cung mot phien.
    const phien = [{ nguon: "google", buoc: ["/", "/a", "/"], luot: 3 }];
    const pheu = gomPheuBuoc(phien);
    const nguon = gomNguon(phien);
    expect(nguon[0].trangTB).toBe(2);
    // Bac cao nhat co phien = so trang khac nhau = trangTB (mot phien).
    const bacCaoNhat = pheu.filter((x) => x.phien > 0).length;
    expect(bacCaoNhat).toBe(nguon[0].trangTB);
  });

  it("bac 2 luon bang tong phienSau cua moi nguon", () => {
    // Bat bien: moi phien thuoc dung mot nguon, phienSau dem phien >= 2 trang
    // khac nhau, nen tong phienSau phai bang so phien dat bac 2.
    const phien = [
      { nguon: "google", buoc: ["/"], luot: 1 },
      { nguon: "google", buoc: ["/", "/a", "/"], luot: 3 },
      { nguon: "facebook", buoc: ["/b", "/c", "/d"], luot: 3 },
      { nguon: "direct", buoc: ["/e"], luot: 4 },
    ];
    const tongPhienSau = gomNguon(phien).reduce((s, n) => s + n.phienSau, 0);
    expect(gomPheuBuoc(phien)[1].phien).toBe(tongPhienSau);
  });
});

describe("gomNguon", () => {
  it("trangTB dem trang KHAC NHAU, khong dem so buoc", () => {
    // Duong / -> /a -> / la 3 buoc nhung chi 2 trang khac nhau.
    const n = gomNguon([{ nguon: "google", buoc: ["/", "/a", "/"], luot: 3 }]);
    expect(n[0].trangTB).toBe(2);
  });

  it("phienSau chi dem phien xem tu 2 trang khac nhau tro len", () => {
    const n = gomNguon([
      { nguon: "google", buoc: ["/"], luot: 1 },
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
    ]);
    expect(n[0].phien).toBe(2);
    expect(n[0].phienSau).toBe(1);
    expect(n[0].tiLeSau).toBe(50);
  });

  it("phien chi tai lai mot trang KHONG tinh la di sau", () => {
    // / -> / bi bo trung lap con mot buoc, nen khong phai "di sau".
    const n = gomNguon([{ nguon: "google", buoc: ["/"], luot: 5 }]);
    expect(n[0].phienSau).toBe(0);
    expect(n[0].tiLeSau).toBe(0);
  });

  it("trangVao lay trang DAU phien, buocKe lay trang thu HAI", () => {
    const n = gomNguon([
      { nguon: "google", buoc: ["/", "/a", "/b"], luot: 3 },
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
    ]);
    expect(n[0].trangVao).toEqual([{ path: "/", phien: 2, luot: 5 }]);
    expect(n[0].buocKe).toEqual([{ path: "/a", phien: 2 }]);
  });

  it("xep giam theo phien va chot tran 10 nguon", () => {
    const phien = Array.from({ length: 14 }, (_, i) =>
      // Nguon i co (i+1) phien -> nguon lon nhat phai dung dau.
      Array.from({ length: i + 1 }, () => ({
        nguon: `ng${i}`,
        buoc: ["/"],
        luot: 1,
      })),
    ).flat();
    const n = gomNguon(phien);
    expect(n).toHaveLength(10);
    expect(n[0].source).toBe("ng13");
    expect(n[0].phien).toBe(14);
    // Da xep giam thi so phien khong bao gio tang len o dong sau.
    for (let i = 1; i < n.length; i++) {
      expect(n[i].phien).toBeLessThanOrEqual(n[i - 1].phien);
    }
  });

  it("chot tran 8 trang vao va 8 buoc ke moi nguon", () => {
    const phien = Array.from({ length: 12 }, (_, i) => ({
      nguon: "google",
      buoc: [`/vao${i}`, `/ke${i}`],
      luot: 2,
    }));
    const n = gomNguon(phien);
    expect(n[0].trangVao).toHaveLength(8);
    expect(n[0].buocKe).toHaveLength(8);
  });

  it("khong co phien thi ra mang rong, khong phai dong rong", () => {
    expect(gomNguon([])).toEqual([]);
  });
});

describe("gomBuocTu", () => {
  it("thoat dem phien KET THUC tai trang do", () => {
    const b = gomBuocTu([
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
      { nguon: "google", buoc: ["/"], luot: 1 },
    ]);
    const goc = b.find((x) => x.path === "/");
    expect(goc?.phien).toBe(2);
    expect(goc?.thoat).toBe(1);
    expect(goc?.di).toEqual([{ path: "/a", phien: 1 }]);
  });

  it("mot phien ghe cung trang hai lan chi dem MOT phien", () => {
    const b = gomBuocTu([{ nguon: "google", buoc: ["/", "/a", "/"], luot: 3 }]);
    const goc = b.find((x) => x.path === "/");
    // Trang "/" xuat hien hai lan trong duong di nhung van la mot phien.
    expect(goc?.phien).toBe(1);
    // Lan cuoi ket thuc tai "/" nen tinh mot lan thoat.
    expect(goc?.thoat).toBe(1);
  });

  it("chot tran 8 dong va 5 dich di tiep moi dong", () => {
    const phien = [
      ...Array.from({ length: 11 }, (_, i) => ({
        nguon: "google",
        buoc: ["/", `/dich${i}`],
        luot: 2,
      })),
      ...Array.from({ length: 12 }, (_, i) => ({
        nguon: "google",
        buoc: [`/goc${i}`, "/x"],
        luot: 2,
      })),
    ];
    const b = gomBuocTu(phien);
    expect(b).toHaveLength(8);
    const goc = b.find((x) => x.path === "/");
    expect(goc?.di).toHaveLength(5);
    // soDich dem TRUOC khi cat: 11 dich that, chi ve duoc 5.
    expect(goc?.soDich).toBe(11);
  });

  it("soDich bang so dong di[] khi chua cham tran", () => {
    const b = gomBuocTu([
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
      { nguon: "google", buoc: ["/", "/b"], luot: 2 },
    ]);
    const goc = b.find((x) => x.path === "/");
    expect(goc?.soDich).toBe(2);
    expect(goc?.di).toHaveLength(2);
  });

  it("trang chi thoat thi soDich = 0", () => {
    const b = gomBuocTu([{ nguon: "google", buoc: ["/"], luot: 1 }]);
    expect(b[0].soDich).toBe(0);
    expect(b[0].di).toEqual([]);
  });

  it("khong co phien thi ra mang rong", () => {
    expect(gomBuocTu([])).toEqual([]);
  });
});

describe("gomDuongDi", () => {
  it("gom cac phien di cung duong lai voi nhau", () => {
    const d = gomDuongDi([
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
      { nguon: "facebook", buoc: ["/", "/a"], luot: 2 },
      { nguon: "google", buoc: ["/", "/b"], luot: 2 },
    ]);
    expect(d[0]).toEqual({ buoc: ["/", "/a"], phien: 2 });
    expect(d[1]).toEqual({ buoc: ["/", "/b"], phien: 1 });
  });

  it("chi lay 3 buoc dau cua duong dai", () => {
    const d = gomDuongDi([
      { nguon: "google", buoc: ["/", "/a", "/b", "/c", "/d"], luot: 5 },
    ]);
    expect(d[0].buoc).toEqual(["/", "/a", "/b"]);
  });

  it("BO phien chi co mot buoc — mot trang khong phai duong di", () => {
    const d = gomDuongDi([{ nguon: "google", buoc: ["/"], luot: 1 }]);
    expect(d).toEqual([]);
  });

  it("giu duong vong: / -> /a -> / khac voi / -> /a", () => {
    const d = gomDuongDi([
      { nguon: "google", buoc: ["/", "/a", "/"], luot: 3 },
      { nguon: "google", buoc: ["/", "/a"], luot: 2 },
    ]);
    expect(d).toHaveLength(2);
  });

  it("chot tran 10 duong", () => {
    const phien = Array.from({ length: 15 }, (_, i) => ({
      nguon: "google",
      buoc: ["/", `/a${i}`],
      luot: 2,
    }));
    expect(gomDuongDi(phien)).toHaveLength(10);
  });

  it("khong co phien thi ra mang rong", () => {
    expect(gomDuongDi([])).toEqual([]);
  });
});

describe("gomHanhVi — hinh dang phan hoi theo hop dong", () => {
  const moc = { days: 7, from: "2026-08-03", den: "2026-08-09" };

  it("khong co du lieu: mang rong, so 0, van du 24 va 168 o", () => {
    const r = gomHanhVi([], moc);
    expect(r.tongPhien).toBe(0);
    expect(r.tongLuot).toBe(0);
    expect(r.nguon).toEqual([]);
    expect(r.buocTu).toEqual([]);
    expect(r.duongDi).toEqual([]);
    expect(r.theoGio).toHaveLength(24);
    expect(r.nhiet).toHaveLength(168);
    expect(r.pheuBuoc).toHaveLength(4);
    // Quy uoc: mang rong chu KHONG phai null, so 0 chu khong phai undefined.
    expect(r.nguon).not.toBeNull();
  });

  it("canhBaoGop luon true — panel phai hien cau canh bao gop khach", () => {
    expect(gomHanhVi([], moc).canhBaoGop).toBe(true);
    expect(gomHanhVi([luot()], moc).canhBaoGop).toBe(true);
  });

  it("tra lai dung moc ngay da truyen vao", () => {
    const r = gomHanhVi([], moc);
    expect(r.days).toBe(7);
    expect(r.from).toBe("2026-08-03");
    expect(r.den).toBe("2026-08-09");
  });

  it("TUYET DOI khong de visitorHash lot ra ngoai", () => {
    const r = gomHanhVi(
      [
        luot({ visitorHash: "hash-bi-mat", phutSauGoc: 0, path: "/" }),
        luot({ visitorHash: "hash-bi-mat", phutSauGoc: 5, path: "/a" }),
      ],
      moc,
    );
    expect(JSON.stringify(r)).not.toContain("hash-bi-mat");
  });

  it("moi so trong phan hoi la Number, khong co BigInt hay undefined", () => {
    const r = gomHanhVi(
      [
        luot({ phutSauGoc: 0, path: "/" }),
        luot({ phutSauGoc: 5, path: "/a" }),
        luot({ phutSauGoc: 200, path: "/b" }),
      ],
      moc,
    );
    // JSON.stringify nem TypeError khi gap BigInt — day la cai luoi bat.
    const lai = JSON.parse(JSON.stringify(r));
    expect(lai.tongPhien).toBe(2);
    expect(lai.tongLuot).toBe(3);
    expect(typeof lai.nguon[0].trangTB).toBe("number");
    expect(typeof lai.nguon[0].tiLeSau).toBe("number");
  });

  it("dem xuoi tu luot tho: cat phien roi gom, khong lech tong", () => {
    const r = gomHanhVi(
      [
        // Khach A: mot phien 3 buoc.
        luot({ visitorHash: "a", phutSauGoc: 0, path: "/" }),
        luot({ visitorHash: "a", phutSauGoc: 5, path: "/cua-hang/" }),
        luot({ visitorHash: "a", phutSauGoc: 9, path: "/san-pham/x/" }),
        // Khach A ghe lai sau 2 tieng: phien thu hai.
        luot({ visitorHash: "a", phutSauGoc: 129, path: "/" }),
        // Khach B: mot phien mot buoc, vao tu facebook.
        luot({ visitorHash: "b", phutSauGoc: 10, path: "/", source: "facebook" }),
      ],
      moc,
    );
    expect(r.tongLuot).toBe(5);
    expect(r.tongPhien).toBe(3);
    // Pheu: 3 phien toi buoc 1, mot phien toi buoc 2 va 3.
    expect(r.pheuBuoc).toEqual([
      { buoc: 1, phien: 3 },
      { buoc: 2, phien: 1 },
      { buoc: 3, phien: 1 },
      { buoc: 4, phien: 0 },
    ]);
    // Tong phien tren bang nguon phai bang tong phien chung.
    expect(r.nguon.reduce((s, n) => s + n.phien, 0)).toBe(3);
    // Tong luot tren bang nguon phai bang tong luot chung.
    expect(r.nguon.reduce((s, n) => s + n.luot, 0)).toBe(5);
  });

  it("daCat mac dinh false, va la false chu khong phai undefined", () => {
    const r = gomHanhVi([], moc);
    expect(r.daCat).toBe(false);
    // undefined bi JSON.stringify bo mat khoa, panel doc ra undefined.
    expect(JSON.parse(JSON.stringify(r)).daCat).toBe(false);
  });

  it("daCat true khi service noi la da cham tran", () => {
    const r = gomHanhVi([luot()], { ...moc, daCat: true });
    expect(r.daCat).toBe(true);
  });
});
