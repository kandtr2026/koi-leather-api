/**
 * Gom so hanh vi khach: nguon -> trang vao -> duong di.
 *
 * MOI HAM TRONG FILE NAY LA HAM THUAN TUY. Khong Prisma, khong Date.now(),
 * khong doc bien moi truong. Vao gi ra gi, nen test duoc khong can co so du lieu.
 *
 * Phan cat mui gio (ngay / gio / thu theo gio Viet Nam) da lam o SQL roi — xem
 * analytics.service.ts:hanhVi. O day chi nhan so da cat san. Cat mui gio bang
 * JS o tang nay la lech 7 tieng, dung dua ve day.
 */

/** Ranh gioi cat phien: hai luot cach nhau QUA muc nay la phien moi. */
export const KHOANG_CAT_PHIEN_MS = 30 * 60 * 1000;

/** Mot luot xem tho lay tu bang, da kem cac truong thoi gian cat theo gio VN. */
export interface LuotTho {
  /** Khoa gom phia server. TUYET DOI khong tra ra ngoai. */
  visitorHash: string;
  path: string;
  source: string;
  /** Moc thoi gian, milli giay. */
  luc: number;
  /** Ngay lich VN dang YYYY-MM-DD, do SQL cat. */
  ngay: string;
  /** Gio VN 0..23, do SQL cat. */
  gio: number;
  /** Thu 0..6 voi 0 = Chu Nhat (Postgres dow), do SQL cat. */
  thu: number;
}

/** Mot phien da cat xong. */
export interface Phien {
  /** Nguon cua luot DAU TIEN trong phien. */
  nguon: string;
  /** Duong di da bo buoc trung lap LIEN TIEP. Luon co it nhat 1 phan tu. */
  buoc: string[];
  /** So luot xem tho cua phien (truoc khi bo trung lap). */
  luot: number;
}

/**
 * Bo buoc trung lap LIEN TIEP.
 *
 * Tai lai trang khong phai buoc moi. CHI bo khi ke nhau: duong
 * / -> /cua-hang/ -> / giu nguyen ca ba buoc vi khach that su quay lai.
 */
export function boTrungLapLienTiep(duong: readonly string[]): string[] {
  const ra: string[] = [];
  for (const p of duong) {
    if (ra.length === 0 || ra[ra.length - 1] !== p) ra.push(p);
  }
  return ra;
}

/**
 * Cat mang luot tho thanh phien.
 *
 * Phien = cung visitorHash + cung ngay lich VN + hai luot lien tiep cach nhau
 * <= khoangCatMs. Dung DUNG 30 phut: cach 30 phut chan la CUNG phien, hon 30
 * phut moi la phien moi.
 *
 * Khong tin thu tu mang vao: tu sap xep theo thoi gian trong tung nhom truoc
 * khi cat. SQL co ORDER BY nhung dua vao do la de vo neu ai doi cau lenh.
 */
export function catPhien(
  luot: readonly LuotTho[],
  khoangCatMs: number = KHOANG_CAT_PHIEN_MS,
): Phien[] {
  // Gom theo khach + ngay. Ngay nam trong khoa vi hash doi moi nua dem nen
  // khong theo duoc qua ngay — xem ghi chu o visitorHash().
  const nhom = new Map<string, LuotTho[]>();
  for (const l of luot) {
    const khoa = `${l.visitorHash}|${l.ngay}`;
    const m = nhom.get(khoa);
    if (m) m.push(l);
    else nhom.set(khoa, [l]);
  }

  const phien: Phien[] = [];
  for (const dong of nhom.values()) {
    dong.sort((a, b) => a.luc - b.luc);

    let dau = 0;
    for (let i = 1; i <= dong.length; i++) {
      const hetNhom = i === dong.length;
      // Chi cat khi khoang cach VUOT nguong, khong cat khi bang.
      const vuotNguong = !hetNhom && dong[i].luc - dong[i - 1].luc > khoangCatMs;
      if (!hetNhom && !vuotNguong) continue;

      const khuc = dong.slice(dau, i);
      phien.push({
        // Nguon lay tu luot DAU phien. Tu trang thu hai tro di referrer la
        // chinh koileather.com nen source thanh 'internal' — lay luot sau la
        // mat dau khach den tu Facebook/Google.
        nguon: khuc[0].source,
        buoc: boTrungLapLienTiep(khuc.map((k) => k.path)),
        luot: khuc.length,
      });
      dau = i;
    }
  }
  return phien;
}

/** Lam tron n chu so thap phan, tra ve Number chu khong phai chuoi. */
function lamTron(x: number, soChuSo: number): number {
  const he = 10 ** soChuSo;
  return Math.round(x * he) / he;
}

/**
 * Xep giam theo so, hoa thi theo ten tang dan.
 *
 * Co ve tuy y nhung can thiet: hai dong cung so ma thu tu nhay moi lan goi thi
 * bang tren panel tu doi cho, va test thanh do do.
 */
function xepGiam<T>(dong: T[], so: (t: T) => number, ten: (t: T) => string): T[] {
  return dong.sort((a, b) => so(b) - so(a) || ten(a).localeCompare(ten(b)));
}

/** Dem so phien theo tung khoa, tra ve mang da xep giam va da chot tran. */
function demTheoKhoa(
  dem: Map<string, number>,
  gioiHan: number,
): { path: string; phien: number }[] {
  const ra = [...dem.entries()].map(([path, phien]) => ({ path, phien }));
  return xepGiam(ra, (r) => r.phien, (r) => r.path).slice(0, gioiHan);
}

export interface TrangVao {
  path: string;
  phien: number;
  luot: number;
}

export interface DongNguon {
  source: string;
  phien: number;
  luot: number;
  trangTB: number;
  phienSau: number;
  tiLeSau: number | null;
  trangVao: TrangVao[];
  buocKe: { path: string; phien: number }[];
}

/**
 * Gom theo nguon dan khach.
 *
 * trangTB dem trang KHAC NHAU moi phien (khong phai so buoc): duong
 * / -> /cua-hang/ -> / la 3 buoc nhung chi 2 trang.
 * phienSau = so phien xem tu 2 trang khac nhau tro len, tuc khach khong thoat
 * ngay o trang dau.
 */
export function gomNguon(
  phien: readonly Phien[],
  gioiHanNguon = 10,
  gioiHanTrang = 8,
): DongNguon[] {
  interface Tho {
    source: string;
    phien: number;
    luot: number;
    tongTrangRieng: number;
    phienSau: number;
    trangVaoPhien: Map<string, number>;
    trangVaoLuot: Map<string, number>;
    buocKe: Map<string, number>;
  }
  const theoNguon = new Map<string, Tho>();

  for (const p of phien) {
    let t = theoNguon.get(p.nguon);
    if (!t) {
      t = {
        source: p.nguon,
        phien: 0,
        luot: 0,
        tongTrangRieng: 0,
        phienSau: 0,
        trangVaoPhien: new Map(),
        trangVaoLuot: new Map(),
        buocKe: new Map(),
      };
      theoNguon.set(p.nguon, t);
    }

    const trangRieng = new Set(p.buoc).size;
    t.phien++;
    t.luot += p.luot;
    t.tongTrangRieng += trangRieng;
    if (trangRieng >= 2) t.phienSau++;

    const vao = p.buoc[0];
    t.trangVaoPhien.set(vao, (t.trangVaoPhien.get(vao) ?? 0) + 1);
    // luot cua trang vao = tong luot tho cua cac phien BAT DAU o trang do,
    // khop nghia voi nguon[].luot ("tong luot cua cac phien do").
    t.trangVaoLuot.set(vao, (t.trangVaoLuot.get(vao) ?? 0) + p.luot);

    const ke = p.buoc[1];
    if (ke !== undefined) t.buocKe.set(ke, (t.buocKe.get(ke) ?? 0) + 1);
  }

  const ra = [...theoNguon.values()].map((t) => ({
    source: t.source,
    phien: t.phien,
    luot: t.luot,
    trangTB: t.phien ? lamTron(t.tongTrangRieng / t.phien, 2) : 0,
    phienSau: t.phienSau,
    // phien == 0 khong xay ra o day (moi dong sinh ra tu mot phien) nhung van
    // tra null theo hop dong, khong tra 0 — 0 la "do duoc va bang khong".
    tiLeSau: t.phien ? lamTron((t.phienSau / t.phien) * 100, 1) : null,
    trangVao: xepGiam(
      [...t.trangVaoPhien.entries()].map(([path, sp]) => ({
        path,
        phien: sp,
        luot: t.trangVaoLuot.get(path) ?? 0,
      })),
      (r) => r.phien,
      (r) => r.path,
    ).slice(0, gioiHanTrang),
    buocKe: demTheoKhoa(t.buocKe, gioiHanTrang),
  }));

  return xepGiam(ra, (r) => r.phien, (r) => r.source).slice(0, gioiHanNguon);
}

/**
 * 24 dong theo gio, DUNG 24 phan tu ke ca gio khong co ai vao.
 *
 * Thieu dong la panel ve lech cot im lang, nen dien 0 chu khong bo qua.
 * khach = so visitorHash khac nhau trong gio do (tinh tren luot tho, khong
 * phai phien).
 */
export function gomTheoGio(
  luot: readonly LuotTho[],
): { gio: number; luot: number; khach: number }[] {
  const demLuot = new Array<number>(24).fill(0);
  const demKhach = Array.from({ length: 24 }, () => new Set<string>());

  for (const l of luot) {
    const g = l.gio;
    // Bo dong co gio ngoai 0..23 thay vi ghi tran ra ngoai mang.
    if (!Number.isInteger(g) || g < 0 || g > 23) continue;
    demLuot[g]++;
    demKhach[g].add(l.visitorHash);
  }

  return Array.from({ length: 24 }, (_, g) => ({
    gio: g,
    luot: demLuot[g],
    khach: demKhach[g].size,
  }));
}

/**
 * Ban do nhiet 7 x 24, DUNG 168 phan tu, thu 0 = Chu Nhat.
 *
 * Thu tu: thu tang dan, trong moi thu thi gio tang dan. veNhiet cua heoiu doi
 * hang 7 phan tu va moi hang 24 o — thieu mot o la lech cot.
 */
export function gomNhiet(
  luot: readonly LuotTho[],
): { thu: number; gio: number; luot: number }[] {
  const dem = new Array<number>(7 * 24).fill(0);
  for (const l of luot) {
    const t = l.thu;
    const g = l.gio;
    if (!Number.isInteger(t) || t < 0 || t > 6) continue;
    if (!Number.isInteger(g) || g < 0 || g > 23) continue;
    dem[t * 24 + g]++;
  }
  const ra: { thu: number; gio: number; luot: number }[] = [];
  for (let t = 0; t < 7; t++) {
    for (let g = 0; g < 24; g++) ra.push({ thu: t, gio: g, luot: dem[t * 24 + g] });
  }
  return ra;
}

/**
 * So ngay lich cua tung thu trong ky, DUNG 7 phan tu, thu 0 = Chu Nhat.
 *
 * De panel chia luot cho so ngay khi so sanh giua cac thu. Khong co truong nay
 * thi bang thu doc sai moi khi ky khong tron tuan: cua so 30 ngay co hai thu
 * xuat hien 5 lan con nam thu kia chi 4 lan, nen hai cot do phong len khoang
 * 25% vi ly do LICH chu khong vi dong khach — va trung vi dung de chia bac mau
 * cua ban do nhiet cung bi keo lech theo.
 *
 * Tinh tu chuoi ngay `from` (YYYY-MM-DD, lich Viet Nam) cong `days` ngay. Dung
 * Date.UTC tu ba so tach ra, khong dung new Date(chuoi): moc UTC giua trua
 * khong the truot sang ngay khac du may chu dat mui gio nao, con new Date() tren
 * chuoi ngay tran thi tuy bo may.
 */
export function gomSoNgayThu(
  from: string,
  days: number,
): { thu: number; soNgay: number }[] {
  const dem = new Array<number>(7).fill(0);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(from);
  const soNgay = Number.isInteger(days) && days > 0 ? days : 0;
  if (m && soNgay > 0) {
    // Giua trua UTC: cong ngay bang cach cong 24 gio khong bao gio nhay lo mot
    // ngay vi khong co gio mua he trong UTC.
    const goc = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
    for (let i = 0; i < soNgay; i++) {
      dem[new Date(goc + i * 24 * 60 * 60 * 1000).getUTCDay()]++;
    }
  }
  return dem.map((so, thu) => ({ thu, soNgay: so }));
}

/**
 * Pheu 4 buoc: so phien xem duoc N trang KHAC NHAU.
 *
 * Dem trang khac nhau, KHONG dem do dai duong. Duong / -> /cua-hang/ -> / la
 * ba buoc nhung chi hai trang, nen phien do dung o bac 2.
 *
 * Truoc day ham nay dem do dai duong. Lap luan luc do ("quay lai la that su di
 * them mot buoc") nghe hop ly nhung sai o cho khac: nhan tren panel ghi "Xem 3
 * trang" va chu thich ghi "dem so trang KHAC NHAU", nen phien xem hai trang bi
 * xep vao dong "Xem 3 trang" — mot cau sai tren man hinh chu shop doc. Ngoai ra
 * trangTB va phienSau trong CUNG phan hoi deu dem trang rieng (dung Set), nen
 * de nguyen thi pheu noi "3 trang" trong khi cot Trang TB cua chinh nguon do in
 * 2,00. Da do tren du lieu that 7 ngay: do dai cho 199/131 o bac 3/4, trang
 * rieng cho 148/101 — phong 34%.
 *
 * Muon do "so buoc" (co tinh lan quay lai) thi phai doi nhan panel truoc, khong
 * doi mot minh ham nay.
 *
 * Buoc 4 nghia la "4 tro len" nen cong don moi phien tu 4 trang rieng tro len.
 * Buoc 1 luon bang tong so phien vi phien nao cung co it nhat mot trang.
 */
export function gomPheuBuoc(
  phien: readonly Phien[],
): { buoc: number; phien: number }[] {
  const dem = [0, 0, 0, 0];
  for (const p of phien) {
    const d = new Set(p.buoc).size;
    for (let i = 0; i < 4; i++) {
      if (d >= i + 1) dem[i]++;
    }
  }
  return dem.map((so, i) => ({ buoc: i + 1, phien: so }));
}

export interface DongBuocTu {
  path: string;
  phien: number;
  thoat: number;
  di: { path: string; phien: number }[];
  /**
   * So dich KHAC NHAU that su, dem TRUOC khi cat con gioiHanDi dong.
   *
   * Khong co truong nay thi panel ve 5 dich va khong cho nao noi la con nua:
   * chu shop tru "phien - thoat" roi cong 5 dong di[] thay hut mat mot nua, va
   * ket luan sai la mat du lieu. Da do tren du lieu that: dong /cua-hang/ co
   * 108 dich khac nhau, panel chi ve 5.
   */
  soDich: number;
}

/**
 * Tu trang nay khach di dau.
 *
 * phien dem theo PHIEN chu khong theo lan ghe: mot phien quay lai cung trang
 * hai lan van tinh mot. thoat = so phien ket thuc tai trang do.
 * di[] cung khu trung theo cap (phien, tu, den) de mot phien di lai cung mot
 * chang hai lan khong lam phong so.
 */
export function gomBuocTu(
  phien: readonly Phien[],
  gioiHan = 8,
  gioiHanDi = 5,
): DongBuocTu[] {
  interface Tho {
    path: string;
    phien: Set<number>;
    thoat: number;
    di: Map<string, Set<number>>;
  }
  const theoTrang = new Map<string, Tho>();
  const lay = (path: string): Tho => {
    let t = theoTrang.get(path);
    if (!t) {
      t = { path, phien: new Set(), thoat: 0, di: new Map() };
      theoTrang.set(path, t);
    }
    return t;
  };

  phien.forEach((p, chiSo) => {
    for (let i = 0; i < p.buoc.length; i++) {
      const t = lay(p.buoc[i]);
      t.phien.add(chiSo);
      if (i === p.buoc.length - 1) {
        t.thoat++;
      } else {
        const den = p.buoc[i + 1];
        const s = t.di.get(den);
        if (s) s.add(chiSo);
        else t.di.set(den, new Set([chiSo]));
      }
    }
  });

  const ra = [...theoTrang.values()].map((t) => ({
    path: t.path,
    phien: t.phien.size,
    thoat: t.thoat,
    di: xepGiam(
      [...t.di.entries()].map(([path, s]) => ({ path, phien: s.size })),
      (r) => r.phien,
      (r) => r.path,
    ).slice(0, gioiHanDi),
    // Dem TRUOC khi cat: t.di.size la so dich that, di.length la so dich ve duoc.
    soDich: t.di.size,
  }));

  return xepGiam(ra, (r) => r.phien, (r) => r.path).slice(0, gioiHan);
}

/** Dau noi cac buoc thanh mot khoa gom. Khong bao gio xuat hien trong path. */
const NOI_KHOA = "\n";

/**
 * Duong di nguyen ven, 3 buoc dau.
 *
 * Chi lay phien di tu 2 buoc tro len: phien mot buoc khong phai "duong di",
 * gop vao chi lam bang toan dong mot trang.
 *
 * Da do tren du lieu that: so nay NHO (duong pho bien nhat 7 phien / 7 ngay).
 * Do la su that cua du lieu, khong phai loi gom — panel phai ghi chu ro.
 */
export function gomDuongDi(
  phien: readonly Phien[],
  gioiHan = 10,
): { buoc: string[]; phien: number }[] {
  const dem = new Map<string, { buoc: string[]; phien: number }>();
  for (const p of phien) {
    if (p.buoc.length < 2) continue;
    const buoc = p.buoc.slice(0, 3);
    // Xuong dong lam dau noi khoa: path lay tu URL nen khong bao gio chua ky
    // tu nay, hai duong khac nhau khong the tao ra cung mot khoa. Dung dau ">"
    // hay khoang trang thi path chua chinh ky tu do se gay nhap nhang.
    const khoa = buoc.join(NOI_KHOA);
    const co = dem.get(khoa);
    if (co) co.phien++;
    else dem.set(khoa, { buoc, phien: 1 });
  }
  return xepGiam(
    [...dem.values()],
    (r) => r.phien,
    (r) => r.buoc.join(NOI_KHOA),
  ).slice(0, gioiHan);
}

/** Hinh dang tra ve cua GET /analytics/hanh-vi. */
export interface HanhViRa {
  days: number;
  from: string;
  den: string;
  tongPhien: number;
  tongLuot: number;
  canhBaoGop: boolean;
  /**
   * True khi so luot keo ve cham tran, tuc moi so trong phan hoi chi tinh tren
   * MOT PHAN cua ky.
   *
   * Phai co co nay vi phan bi cat la phan MOI NHAT (SQL sap tang dan theo thoi
   * gian): panel se ve du `days` ngay nhung vai ngay cuoi ra 0 luot, nhin het
   * nhu mat du lieu chu khong nhu bi cat. days/from/den van ghi ca ky nen tu
   * chung khong lo ra dieu gi.
   */
  daCat: boolean;
  nguon: DongNguon[];
  theoGio: { gio: number; luot: number; khach: number }[];
  nhiet: { thu: number; gio: number; luot: number }[];
  /** So ngay lich cua tung thu trong ky. DUNG 7 phan tu, thu 0 = Chu Nhat. */
  soNgayThu: { thu: number; soNgay: number }[];
  pheuBuoc: { buoc: number; phien: number }[];
  buocTu: DongBuocTu[];
  duongDi: { buoc: string[]; phien: number }[];
}

/**
 * Gom tat ca lai thanh phan hoi. Vao la luot tho, ra la JSON dung hop dong.
 *
 * Tach rieng khoi service de test duoc toan bo phan tinh so ma khong can
 * Prisma: service chi con viec chay SQL roi goi ham nay.
 */
export function gomHanhVi(
  luot: readonly LuotTho[],
  moc: { days: number; from: string; den: string; daCat?: boolean },
): HanhViRa {
  const phien = catPhien(luot);
  return {
    days: moc.days,
    from: moc.from,
    den: moc.den,
    tongPhien: phien.length,
    // Day la so luot DEM DUOC, tuc sau khi tran cua service da cat. Trung voi
    // "tong luot trong ky" chi khi daCat = false.
    tongLuot: luot.length,
    daCat: moc.daCat === true,
    // Luon true: visitorHash gop khach chung IP nha mang + cung loai may, nen
    // panel PHAI hien cau canh bao. Xem muc 1 cua hop dong.
    canhBaoGop: true,
    nguon: gomNguon(phien),
    theoGio: gomTheoGio(luot),
    nhiet: gomNhiet(luot),
    soNgayThu: gomSoNgayThu(moc.from, moc.days),
    pheuBuoc: gomPheuBuoc(phien),
    buocTu: gomBuocTu(phien),
    duongDi: gomDuongDi(phien),
  };
}
