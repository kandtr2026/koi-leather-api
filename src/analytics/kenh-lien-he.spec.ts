/**
 * Gom so cu bam nut lien he — test hanh vi that, khong can co so du lieu.
 *
 * Vi sao can test: day la nhung con so chu shop dung de tra loi "khach nhan tin
 * cho minh den tu dau", roi dua vao do quyet dinh chi tien quang cao. Sai o day
 * KHONG bao loi — chi ra mot con so tron tru nhung lech.
 *
 * Hai hop dong phai chot bang test, vi doi mot dong la chung im lang truot:
 *  1. Kenh la bi loai khoi MOI con so, ke ca tongLan. Neu khong, ba the kenh
 *     tren panel cong lai khong bang the tong ma khong ai doan ra tai sao.
 *  2. theoKenh LUON du ba dong ke ca khi bang rong. Thieu dong la panel ve
 *     thieu the, nhin het nhu tinh nang chua chay chu khong nhu "chua ai bam".
 */
import {
  KENH,
  NHAN_KENH,
  gomKenhLienHe,
  laKenhHopLe,
  type CuBamTho,
} from "./kenh-lien-he";

/**
 * Dung mot cu bam tho.
 *
 * Mac dinh la khach "khach-a" bam Zalo tu google — phan lon test chi quan tam
 * mot hai truong, khoi phai viet du bon lan nao cung the.
 */
function bam(p: Partial<CuBamTho> = {}): CuBamTho {
  return {
    visitorHash: p.visitorHash ?? "khach-a",
    channel: p.channel ?? "zalo",
    source: p.source ?? "google",
    path: p.path ?? "/",
  };
}

/** Lay so lan cua mot kenh trong ket qua, cho test doc gon. */
function lanKenh(ra: ReturnType<typeof gomKenhLienHe>, khoa: string): number {
  return ra.theoKenh.find((d) => d.khoa === khoa)!.soLan;
}

describe("laKenhHopLe", () => {
  it("nhan dung ba kenh that", () => {
    expect(KENH.every(laKenhHopLe)).toBe(true);
  });

  it("loai gia tri la, chuoi rong, va thu khong phai chuoi", () => {
    // Duong ghi la duong CONG KHAI: ai goi cung duoc, gui gi cung duoc. Nen
    // ham nay phai chiu duoc ca thu khong phai chuoi, khong chi kenh viet sai.
    for (const xau of ["", "ZALO", "tel", "email", "zalo ", null, undefined, 7]) {
      expect(laKenhHopLe(xau)).toBe(false);
    }
  });
});

describe("gomKenhLienHe — bang rong", () => {
  const ra = gomKenhLienHe([]);

  it("tra so 0 chu khong tra undefined", () => {
    expect(ra.tongLan).toBe(0);
    expect(ra.tongNguoi).toBe(0);
  });

  it("VAN du ba dong kenh, moi dong bang 0", () => {
    // Chot hop dong: panel ve the tu danh sach nay. Bang rong ma tra [] la
    // panel mat sach ba the, trong y nhu tinh nang chua chay.
    expect(ra.theoKenh.map((d) => d.khoa)).toEqual(["zalo", "messenger", "phone"]);
    expect(ra.theoKenh.every((d) => d.soLan === 0 && d.soNguoi === 0)).toBe(true);
  });

  it("khong bay ra nguon hay o cheo nao", () => {
    // Nguoc lai voi theoKenh: danh sach nguon dai, mot cot 0 cho tiktok khi shop
    // khong chay tiktok chi lam roi bang.
    expect(ra.theoNguon).toEqual([]);
    expect(ra.cheo).toEqual([]);
  });
});

describe("gomKenhLienHe — kenh la bi loai", () => {
  const ra = gomKenhLienHe([
    bam({ channel: "zalo" }),
    bam({ channel: "email" }),
    bam({ channel: "" }),
    bam({ channel: "ZALO" }),
  ]);

  it("khong dem kenh la vao tongLan", () => {
    expect(ra.tongLan).toBe(1);
  });

  it("ba the kenh cong lai BANG the tong", () => {
    const cong = ra.theoKenh.reduce((t, d) => t + d.soLan, 0);
    expect(cong).toBe(ra.tongLan);
  });

  it("cung khong dem kenh la vao bang nguon", () => {
    // Cho de sai: loc o vong ve the kenh nhung quen loc o bang nguon, thi bang
    // nguon phong len va hai bang tren cung panel khong khop nhau.
    expect(ra.theoNguon).toEqual([
      { khoa: "google", nhan: "google", soLan: 1, soNguoi: 1 },
    ]);
    expect(ra.cheo).toEqual([{ channel: "zalo", source: "google", soLan: 1 }]);
  });

  it("bo het khi khong con dong nao hop le", () => {
    const trong = gomKenhLienHe([bam({ channel: "email" })]);
    expect(trong.tongLan).toBe(0);
    expect(trong.tongNguoi).toBe(0);
    expect(trong.theoNguon).toEqual([]);
  });
});

describe("gomKenhLienHe — so lan khac so nguoi", () => {
  // Khach-a bam Zalo ba lan (dau trang, giua trang, cuoi trang), khach-b bam
  // mot lan. Ca bon deu la cu bam that nen deu duoc mot dong.
  const ra = gomKenhLienHe([
    bam({ visitorHash: "khach-a" }),
    bam({ visitorHash: "khach-a" }),
    bam({ visitorHash: "khach-a" }),
    bam({ visitorHash: "khach-b" }),
  ]);

  it("dem 4 lan nhung chi 2 nguoi", () => {
    expect(ra.tongLan).toBe(4);
    expect(ra.tongNguoi).toBe(2);
  });

  it("tach dung ca hai con so o tung kenh", () => {
    const zalo = ra.theoKenh.find((d) => d.khoa === "zalo")!;
    expect(zalo).toEqual({ khoa: "zalo", nhan: "Zalo", soLan: 4, soNguoi: 2 });
  });

  it("tach dung ca hai con so o tung nguon", () => {
    expect(ra.theoNguon).toEqual([
      { khoa: "google", nhan: "google", soLan: 4, soNguoi: 2 },
    ]);
  });

  it("khong dem trung nguoi qua nhieu kenh", () => {
    // Mot khach bam ca Zalo va Gọi dien la MOT nguoi o tongNguoi, nhung la mot
    // nguoi o CA HAI dong kenh — cong soNguoi cua ba kenh khong nhat thiet bang
    // tongNguoi, va do la dung.
    const hai = gomKenhLienHe([
      bam({ visitorHash: "khach-a", channel: "zalo" }),
      bam({ visitorHash: "khach-a", channel: "phone" }),
    ]);
    expect(hai.tongNguoi).toBe(1);
    expect(lanKenh(hai, "zalo")).toBe(1);
    expect(lanKenh(hai, "phone")).toBe(1);
  });
});

describe("gomKenhLienHe — bang cheo kenh x nguon", () => {
  const ra = gomKenhLienHe([
    bam({ channel: "zalo", source: "google" }),
    bam({ channel: "zalo", source: "google" }),
    bam({ channel: "zalo", source: "facebook" }),
    bam({ channel: "phone", source: "google" }),
  ]);

  it("tach rieng tung o, khong tron hai chieu vao nhau", () => {
    expect(ra.cheo).toEqual([
      { channel: "zalo", source: "google", soLan: 2 },
      { channel: "phone", source: "google", soLan: 1 },
      { channel: "zalo", source: "facebook", soLan: 1 },
    ]);
  });

  it("cac o cong lai bang tongLan", () => {
    expect(ra.cheo.reduce((t, o) => t + o.soLan, 0)).toBe(ra.tongLan);
  });

  it("khong lam khoa cheo trung nhau khi nguon co ky tu la", () => {
    // Ban dau ham nay ghep 'kenh + dau phan cach + nguon' thanh mot khoa chuoi.
    // Cach do phai chon duoc ky tu ma gia tri that chac chan khong chua — khong
    // ai bao dam duoc — va khoa trung thi hai o cong don IM LANG. Gio dung Map
    // long nhau nen khong con dau phan cach nao de va.
    const la = gomKenhLienHe([
      bam({ channel: "zalo", source: "a-b" }),
      bam({ channel: "zalo", source: "a_b" }),
      bam({ channel: "zalo", source: "a b" }),
      bam({ channel: "zalo", source: "a:b" }),
    ]);
    expect(la.cheo).toHaveLength(4);
    expect(la.cheo.every((o) => o.soLan === 1)).toBe(true);
  });
});

describe("gomKenhLienHe — nhan va thu tu", () => {
  it("dan nhan tieng Viet cho kenh, khong de panel tu doan", () => {
    const ra = gomKenhLienHe([bam({ channel: "phone" })]);
    expect(ra.theoKenh.map((d) => d.nhan)).toEqual([
      NHAN_KENH.zalo,
      NHAN_KENH.messenger,
      NHAN_KENH.phone,
    ]);
  });

  it("goi ham dat nhan nguon khi duoc truyen", () => {
    const ra = gomKenhLienHe([bam({ source: "search_khac" })], (s) =>
      s === "search_khac" ? "Tim kiem khac" : s,
    );
    expect(ra.theoNguon[0].nhan).toBe("Tim kiem khac");
  });

  it("xep nguon nhieu nhat len dau", () => {
    const ra = gomKenhLienHe([
      bam({ source: "facebook" }),
      bam({ source: "google" }),
      bam({ source: "google" }),
    ]);
    expect(ra.theoNguon.map((d) => d.khoa)).toEqual(["google", "facebook"]);
  });

  it("cung so lan thi xep theo ten, cho thu tu on dinh giua hai lan goi", () => {
    // Bang nhay cho mot cach vo co khi chu shop bam lam moi la nhin nhu du lieu
    // dang doi, du con so y nguyen.
    const ra = gomKenhLienHe([
      bam({ source: "zalo" }),
      bam({ source: "facebook" }),
      bam({ source: "google" }),
    ]);
    expect(ra.theoNguon.map((d) => d.khoa)).toEqual([
      "facebook",
      "google",
      "zalo",
    ]);
  });
});
