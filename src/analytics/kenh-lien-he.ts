/**
 * Gom so cu bam nut lien he: theo kenh, theo nguon, va cheo hai chieu.
 *
 * MOI HAM TRONG FILE NAY LA HAM THUAN TUY. Khong Prisma, khong Date.now(),
 * khong doc bien moi truong. Vao gi ra gi, nen test duoc khong can co so du lieu.
 * Giong hanh-vi.ts, va vi cung mot ly do: phan gom so la phan de sai nhat ma
 * cung la phan de test nhat, mien la no khong dinh vao I/O.
 *
 * Phan cat ky (dauNgayVN) da lam o tang service. O day chi nhan dong da loc san.
 */

/** Ba kenh lien he, dung thu tu hien ra o panel. */
export const KENH = ["zalo", "messenger", "phone"] as const;

export type Kenh = (typeof KENH)[number];

/** Nhan tieng Viet cho tung kenh. Backend tra kem de panel khong tu doan. */
export const NHAN_KENH: Record<Kenh, string> = {
  zalo: "Zalo",
  messenger: "Messenger",
  phone: "Gọi điện",
};

/**
 * Kenh gui len co hop le khong.
 *
 * Duong ghi la duong CONG KHAI: ai goi cung duoc, gui gi cung duoc. Khong loc
 * thi bang day rac va cac the tren panel cong lai khong bang tong.
 */
export function laKenhHopLe(s: unknown): s is Kenh {
  return typeof s === "string" && (KENH as readonly string[]).includes(s);
}

/** Mot cu bam tho lay tu bang. */
export interface CuBamTho {
  /** Khoa gom phia server. TUYET DOI khong tra ra ngoai. */
  visitorHash: string;
  channel: string;
  source: string;
  path: string;
}

/** Mot dong dem, dung cho ca bang kenh va bang nguon. */
export interface DongDem {
  /** Gia tri may (zalo, google...) — panel dung lam khoa, khong hien ra. */
  khoa: string;
  /** Chu hien ra cho nguoi doc. */
  nhan: string;
  /** So LAN bam. */
  soLan: number;
  /** So NGUOI bam (visitorHash rieng biet). Luon <= soLan. */
  soNguoi: number;
}

export interface DongCheo {
  channel: string;
  source: string;
  soLan: number;
}

export interface KenhLienHeRa {
  /** So LAN bam. Mot khach bam Zalo hai lan tinh hai. */
  tongLan: number;
  /**
   * So NGUOI bam, dem theo visitorHash rieng biet.
   *
   * Phai tra ca hai con so nay chu khong chi mot: hash doi moi nua dem (xem
   * visitorHash o analytics.service.ts) nen "so nguoi" cua ky nhieu ngay thuc ra
   * la tong so nguoi-moi-ngay. Chu shop doc "12 lan / 9 nguoi" thi hieu ngay,
   * con chi thay mot so 12 thi de tuong la 12 nguoi khac nhau.
   */
  tongNguoi: number;
  theoKenh: DongDem[];
  theoNguon: DongDem[];
  cheo: DongCheo[];
}

/** Dem len mot bac trong Map so dem. */
function themLan(bang: Map<string, number>, khoa: string): void {
  bang.set(khoa, (bang.get(khoa) ?? 0) + 1);
}

/** Them mot nguoi vao Map tap hop, tao tap neu chua co. */
function themNguoi(
  bang: Map<string, Set<string>>,
  khoa: string,
  ai: string,
): void {
  let tap = bang.get(khoa);
  if (!tap) {
    tap = new Set();
    bang.set(khoa, tap);
  }
  tap.add(ai);
}

/**
 * Gom so tu danh sach cu bam tho.
 *
 * LOAI KENH LA khoi moi con so, khong phai chi khoi bang kenh. Neu de dong kenh
 * la trong tongLan ma bo khoi theoKenh thi ba the tren panel cong lai khong bang
 * the tong, va khong ai doan ra tai sao.
 *
 * theoKenh LUON du ba dong ke ca khi bang rong. Thieu dong la panel ve thieu
 * the, nhin het nhu tinh nang chua chay chu khong nhu "chua ai bam Messenger".
 * theoNguon thi nguoc lai — chi hien nguon THAT SU co, vi danh sach nguon dai va
 * mot cot 0 cho tiktok khi shop khong chay tiktok chi lam roi bang.
 */
export function gomKenhLienHe(
  cuBam: readonly CuBamTho[],
  nhanNguon: (s: string) => string = (s) => s,
): KenhLienHeRa {
  const sach = cuBam.filter((c) => laKenhHopLe(c.channel));

  const nguoiTheoKenh = new Map<string, Set<string>>();
  const lanTheoKenh = new Map<string, number>();
  const nguoiTheoNguon = new Map<string, Set<string>>();
  const lanTheoNguon = new Map<string, number>();
  const moiNguoi = new Set<string>();

  // Bang cheo dung Map LONG NHAU chu khong ghep 'kenh + dau phan cach + nguon'
  // thanh mot khoa chuoi. Ghep chuoi thi phai chon duoc ky tu ma gia tri that
  // chac chan khong chua — dieu do khong ai bao dam duoc, va khoa trung nhau thi
  // hai o cua bang cong don im lang chu khong bao loi.
  const cheoTheoKenh = new Map<string, Map<string, number>>();

  for (const c of sach) {
    moiNguoi.add(c.visitorHash);

    themLan(lanTheoKenh, c.channel);
    themNguoi(nguoiTheoKenh, c.channel, c.visitorHash);

    themLan(lanTheoNguon, c.source);
    themNguoi(nguoiTheoNguon, c.source, c.visitorHash);

    let theoNguon = cheoTheoKenh.get(c.channel);
    if (!theoNguon) {
      theoNguon = new Map();
      cheoTheoKenh.set(c.channel, theoNguon);
    }
    themLan(theoNguon, c.source);
  }

  return {
    tongLan: sach.length,
    tongNguoi: moiNguoi.size,
    theoKenh: KENH.map((k) => ({
      khoa: k,
      nhan: NHAN_KENH[k],
      soLan: lanTheoKenh.get(k) ?? 0,
      soNguoi: nguoiTheoKenh.get(k)?.size ?? 0,
    })),
    theoNguon: [...lanTheoNguon.entries()]
      .map(([s, soLan]) => ({
        khoa: s,
        nhan: nhanNguon(s),
        soLan,
        soNguoi: nguoiTheoNguon.get(s)?.size ?? 0,
      }))
      // Nhieu nhat len dau; cung so thi theo ten cho thu tu on dinh giua hai lan
      // goi — bang nhay cho mot cach vo co la nhin nhu du lieu dang doi.
      .sort((a, b) => b.soLan - a.soLan || a.khoa.localeCompare(b.khoa)),
    cheo: [...cheoTheoKenh.entries()]
      .flatMap(([channel, theoNguon]) =>
        [...theoNguon.entries()].map(([source, soLan]) => ({
          channel,
          source,
          soLan,
        })),
      )
      .sort(
        (a, b) =>
          b.soLan - a.soLan ||
          a.channel.localeCompare(b.channel) ||
          a.source.localeCompare(b.source),
      ),
  };
}
