/**
 * Lọc IP nội bộ khỏi thống kê.
 *
 * Chủ shop tự duyệt web, tự test — những lượt đó không phải khách. Lọc NGAY
 * LÚC GHI (giống lọc bot): một nơi duy nhất, mọi bảng và mọi con số sau đó
 * đều sạch, khỏi phải sửa từng truy vấn. Lọc lúc đọc thì phải nhớ kèm điều
 * kiện vào từng câu SQL và mọi thứ dễ lệch nhau.
 *
 * Danh sách IP đặt trong biến môi trường ANALYTICS_IP_NOI_BO, phân tách bằng
 * dấu phẩy / khoảng trắng / chấm phẩy / xuống dòng. Mỗi mục là:
 *   - địa chỉ đơn: "1.2.3.4" (IPv4) hay "2001:db8::1" (IPv6)
 *   - dải mạng CIDR: "1.2.3.0/24", "172.16.0.0/12"
 * Nội dung sau dấu # là chú thích, bỏ đi.
 *
 * MỌI HÀM TRONG FILE NÀY LÀ HÀM THUẦN TUÝ: không đọc biến môi trường, không
 * network. Phân tích chuỗi môi trường bằng docIpNoiBo() rồi truyền xuống —
 * test được không cần cơ sở dữ liệu.
 */

import { isIP } from "node:net";

/** Một mục trong danh sách IP nội bộ. */
export interface IpNoiBo {
  /** 16 byte, IPv4 được map sang dạng ::ffff:a.b.c.d như net module. */
  bytes: Buffer;
  /** Số bit tính từ đầu ĐỊA CHỈ (không phải đầu mảng 16 byte). */
  bit: number;
  /** Vị trí byte đầu tiên của địa chỉ trong mảng 16 byte: 0 với IPv6, 12 với IPv4. */
  batDau: number;
}

/** IPv4 sang 16 byte dạng ::ffff:a.b.c.d. */
function ipv4Sang16(o: string): Buffer | null {
  const cac = o.split(".");
  if (cac.length !== 4) return null;
  const byte = Buffer.alloc(16);
  byte[10] = 0xff;
  byte[11] = 0xff;
  for (let i = 0; i < 4; i++) {
    const n = Number(cac[i]);
    if (!Number.isInteger(n) || n < 0 || n > 255) return null;
    byte[12 + i] = n;
  }
  return byte;
}

/**
 * IPv6 sang 16 byte, có nén "::". Nhóm cuối có thể là dạng IPv4
 * ("::ffff:1.2.3.4") — tách ra trước khi ghép để khỏi đọc sai.
 *
 * CẨN THẬN với "::": nhóm TRÁI của "::" nằm từ ĐẦU địa chỉ, nhóm PHẢI nằm ở
 * CUỐI. Can phải toàn bộ (như cách làm IPv4-mapped) là "2001:db8::1" đụng
 * thẳng vào cuối mảng — so bit sai từ byte đầu tiên.
 */
function ipv6Sang16(o: string): Buffer | null {
  const hai = o.split("::");
  if (hai.length > 2) return null;

  const gomNhom = (phan: string[], dich: number[]) => {
    for (const p of phan) {
      if (!p) return false;
      if (p.indexOf(".") !== -1) {
        const v4 = ipv4Sang16(p);
        if (!v4) return false;
        dich.push(v4[12], v4[13], v4[14], v4[15]);
        continue;
      }
      if (!/^[0-9a-fA-F]{1,4}$/.test(p)) return false;
      const n = parseInt(p, 16);
      dich.push(n >> 8, n & 0xff);
    }
    return true;
  };

  const trai: number[] = [];
  const phai: number[] = [];
  if (hai[0] && !gomNhom(hai[0].split(":"), trai)) return null;
  if (hai.length === 2 && hai[1] && !gomNhom(hai[1].split(":"), phai)) return null;
  if (trai.length + phai.length > 16) return null;

  const buf = Buffer.alloc(16);
  for (let i = 0; i < trai.length; i++) buf[i] = trai[i];
  for (let i = 0; i < phai.length; i++) buf[16 - phai.length + i] = phai[i];
  return buf;
}

/** Địa chỉ (IPv4 hoặc IPv6) sang 16 byte; trả null khi chuỗi không phải IP. */
function ipSang16(o: string): Buffer | null {
  const loai = isIP(o);
  if (loai === 4) return ipv4Sang16(o);
  if (loai === 6) return ipv6Sang16(o);
  return null;
}

/** Một mục trong chuỗi cấu hình: "1.2.3.4" hoặc "1.2.3.0/24". */
function docMotMuc(muc: string): IpNoiBo | null {
  const s = muc.trim();
  if (!s) return null;
  let bit = -1;
  const co = s.indexOf("/");
  let ip = s;
  if (co !== -1) {
    ip = s.slice(0, co).trim();
    const chuoiBit = s.slice(co + 1).trim();
    // "1.2.3.4/" (bán kính rỗng) là rác, không phải CIDR hợp lệ.
    if (!chuoiBit) return null;
    const n = Number(chuoiBit);
    if (!Number.isInteger(n) || n < 0 || n > 128) return null;
    bit = n;
  }
  const bytes = ipSang16(ip);
  if (!bytes) return null;
  const laV4 = ip.indexOf(".") !== -1;
  // IPv4 không ghi bán kính thì chốt 32 bit; IPv6 không ghi thì 128.
  if (bit === -1) bit = laV4 ? 32 : 128;
  // CIDR viết theo IPv4 (1.2.3.0/24) mà kéo tới 128 là vô nghĩa.
  if (laV4 && bit > 32) return null;
  // IPv4 map lệch 96 bit (12 byte) trong mảng 16 byte: 1.2.3.4 nằm ở byte 12-15.
  return { bytes, bit, batDau: laV4 ? 12 : 0 };
}

/**
 * Phân tích chuỗi biến môi trường ANALYTICS_IP_NOI_BO.
 *
 * Trả mảng rỗng khi chuỗi rỗng hoặc toàn mục rác — lọc không khớp gì, tức là
 * hành vi như trước khi có tính năng này. Không bao giờ nem.
 */
export function docIpNoiBo(chuoi: string | undefined | null): IpNoiBo[] {
  const s = String(chuoi || "").trim();
  if (!s) return [];
  const ra: IpNoiBo[] = [];
  for (const muc of s.split(/[\s,;]+/)) {
    const khongChuThich = muc.split("#")[0].trim();
    if (!khongChuThich) continue;
    const v = docMotMuc(khongChuThich);
    if (v) ra.push(v);
  }
  return ra;
}

/**
 * Gộp hai nguồn cấu hình (biến môi trường + file data/ip-noi-bo.txt) thành
 * một danh sách. Gộp bằng cách nối chuỗi rồi để docIpNoiBo() tách — file
 * thiếu hoặc biến chưa đặt chỉ là nửa chuỗi rỗng, không lỗi.
 */
export function gopIpNoiBo(
  env: string | undefined | null,
  file: string | undefined | null,
): IpNoiBo[] {
  return docIpNoiBo([env || "", file || ""].join("\n"));
}

/**
 * IP này có nằm trong danh sách IP nội bộ không.
 *
 * So khớp theo bit TỪ ĐẦU ĐỊA CHỈ (v.bytes[v.batDau ..]): 1.2.3.4 /24 so 24 bit
 * đầu của 4 byte 1.2.3. RFC 2373 quy định so sánh IPv4-mapped (::ffff:1.2.3.4)
 * và IPv4 (1.2.3.4) là một — đây là lý do chuẩn hoá mọi thứ về 16 byte từ đầu
 * và giữ riêng vị trí bắt đầu.
 */
export function laIpNoiBo(ip: string, danhSach: readonly IpNoiBo[]): boolean {
  if (!danhSach.length) return false;
  const dich = ipSang16(ip);
  if (!dich) return false;
  for (const v of danhSach) {
    const dungBytes = Math.floor(v.bit / 8);
    let khop = true;
    for (let i = 0; i < dungBytes; i++) {
      if (v.bytes[v.batDau + i] !== dich[v.batDau + i]) {
        khop = false;
        break;
      }
    }
    if (!khop) continue;
    const du = v.bit % 8;
    if (du === 0) return true;
    // So sánh phần bit thừa: dịch phải để che phần còn dư.
    if (v.bytes[v.batDau + dungBytes] >> (8 - du) === dich[v.batDau + dungBytes] >> (8 - du)) {
      return true;
    }
  }
  return false;
}