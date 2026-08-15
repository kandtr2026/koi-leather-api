/**
 * Dịch IP ra khu vực bằng geoip-lite (MaxMind GeoLite2, chạy OFFLINE).
 *
 * Kết quả lưu thẳng vào cột `khuVuc` LÚC GHI lượt xem, không tra cứu lại lúc
 * đọc — khỏi nợ một lần tra cứu ngoài cho mỗi lần mở panel.
 *
 * Cột `region` của bản dữ liệu VN trộn HAI hệ mã (đo trên dữ liệu thật):
 *   - mã ISO: SG (TP.HCM), HN (Hà Nội), DN (Đà Nẵng), HP (Hải Phòng), CT (Cần Thơ)
 *   - mã số FIPS cũ: 41 = Long An, 67 = Nam Định, 21 = Thanh Hoá…
 * Còn cột `city` thì lúc có dấu lúc không ("hanoi", "huế", "thu dau mot").
 * Nên ưu tiên city đã chuẩn hoá, hụt thì tra mã region, hụt nữa thì trả nước.
 *
 * MỌI HÀM TRONG FILE NÀY LÀ HÀM THUẦN TUÝ ngoài hàm mặc định khuVuc() —
 * tra cứu được truyền vào để test bằng dữ liệu giả, không cần internet.
 */

import { lookup as traCuuMaxMind } from "geoip-lite";

/** Một dòng trả về của geoip-lite — chỉ lấy phần ta cần. */
export interface TinHieu {
  country?: string;
  region?: string;
  city?: string;
}

/** Hàm tra cứu: truyền vào để test. Mặc định là lookup của geoip-lite. */
export type TraCuu = (ip: string) => TinHieu | null;

/** Bỏ dấu, hạ thường, chỉ giữ chữ và số: "Ho Chi Minh City" -> "hochiminhcity". */
function chuanHoa(t: string): string {
  return t
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Bảng thành phố (đã chuẩn hoá) -> tên tỉnh tiếng Việt.
 *
 * Đo trên dữ liệu thật: với VN, city có giá trị thường đọc rõ hơn mã region
 * ("hanoi", "ho chi minh city", "huế", "vũng tàu"…). Chỉ liệt kê chỗ ĐO ĐƯỢC,
 * không phỏng đoán; thành phố lạ thì rơi xuống tra mã region.
 */
const TINH_THEO_THANH_PHO: Record<string, string> = {
  hanoi: "Hà Nội",
  "ha noi": "Hà Nội",
  hadong: "Hà Nội",
  gialam: "Hà Nội",
  melinh: "Hà Nội",
  donganh: "Hà Nội",
  thuongtin: "Hà Nội",
  maidich: "Hà Nội",
  caugiay: "Hà Nội",
  xuandinh: "Hà Nội",
  hoankiem: "Hà Nội",
  "ho chi minh city": "TP Hồ Chí Minh",
  saigon: "TP Hồ Chí Minh",
  hochiminhcity: "TP Hồ Chí Minh",
  tanbinh: "TP Hồ Chí Minh",
  binhthanh: "TP Hồ Chí Minh",
  cuchi: "TP Hồ Chí Minh",
  thuduc: "TP Hồ Chí Minh",
  quanbay: "TP Hồ Chí Minh",
  danang: "Đà Nẵng",
  hoavang: "Đà Nẵng",
  haiphong: "Hải Phòng",
  cantho: "Cần Thơ",
  hue: "Thừa Thiên-Huế",
  thainguyen: "Thái Nguyên",
  nhatrang: "Khánh Hòa",
  camranh: "Khánh Hòa",
  camlam: "Khánh Hòa",
  khanhhoa: "Khánh Hòa",
  bacgiang: "Bắc Giang",
  lucngan: "Bắc Giang",
  bienhoa: "Đồng Nai",
  dinhquan: "Đồng Nai",
  dongnai: "Đồng Nai",
  vungtau: "Bà Rịa-Vũng Tàu",
  baria: "Bà Rịa-Vũng Tàu",
  haiduong: "Hải Dương",
  chilinh: "Hải Dương",
  bacninh: "Bắc Ninh",
  namdinh: "Nam Định",
  haihau: "Nam Định",
  hungyen: "Hưng Yên",
  quangnam: "Quảng Nam",
  hoian: "Quảng Nam",
  nuithanh: "Quảng Nam",
  tienphuoc: "Quảng Nam",
  hagiang: "Hà Giang",
  halong: "Quảng Ninh",
  thanhphouongbi: "Quảng Ninh",
  thanhhoa: "Thanh Hóa",
  bimson: "Thanh Hóa",
  thoxuan: "Thanh Hóa",
  thieuhoa: "Thanh Hóa",
  dalat: "Lâm Đồng",
  baoloc: "Lâm Đồng",
  lamdong: "Lâm Đồng",
  vinh: "Nghệ An",
  dienchau: "Nghệ An",
  hoangmai: "Nghệ An",
  yenthanh: "Nghệ An",
  ninhbinh: "Ninh Bình",
  thaibinh: "Thái Bình",
  thuanan: "Bình Dương",
  thudautomot: "Bình Dương",
  buonmathuot: "Đắk Lắk",
  donghoi: "Quảng Bình",
  badon: "Quảng Bình",
  quanhau: "Quảng Bình",
  quangbinh: "Quảng Bình",
  longan: "Long An",
  tanan: "Long An",
  viettri: "Phú Thọ",
  thanhba: "Phú Thọ",
  phutho: "Phú Thọ",
  bentre: "Bến Tre",
  mocay: "Bến Tre",
  soctrang: "Sóc Trăng",
  quangngai: "Quảng Ngãi",
  phanthiet: "Bình Thuận",
  langson: "Lạng Sơn",
  phuly: "Hà Nam",
  hanam: "Hà Nam",
  baclieu: "Bạc Liêu",
  binhphuoc: "Bình Phước",
  dongxoai: "Bình Phước",
  dongha: "Quảng Trị",
  tayninh: "Tây Ninh",
  tuyenquang: "Tuyên Quang",
  camau: "Cà Mau",
  tuyhoa: "Phú Yên",
  vinhlong: "Vĩnh Long",
  pleiku: "Gia Lai",
  laocai: "Lào Cai",
  rachgia: "Kiên Giang",
  kiengiang: "Kiên Giang",
  quangtri: "Quảng Trị",
  quinhon: "Bình Định",
  dienbienphu: "Điện Biên",
  caolanh: "Đồng Tháp",
  apthapmuoi: "Đồng Tháp",
  dongthap: "Đồng Tháp",
  longxuyen: "An Giang",
  angiag: "An Giang",
  travinh: "Trà Vinh",
  kontum: "Kon Tum",
  vinhphuc: "Vĩnh Phúc",
  vinhyen: "Vĩnh Phúc",
  phanrang: "Ninh Thuận",
  hatinh: "Hà Tĩnh",
  backan: "Bắc Kạn",
  vithanh: "Hậu Giang",
  yenbai: "Yên Bái",
};

/**
 * Bảng mã region (đo thực tế từ dữ liệu geoip-lite) -> tên tỉnh tiếng Việt.
 *
 * Chỉ đưa mã ĐO ĐƯỢC — với các mã số lạ (ít gặp) cứ để rơi xuống "Việt Nam"
 * thay vì đoán sai tên tỉnh.
 */
const TINH_THEO_MA: Record<string, string> = {
  HN: "Hà Nội",
  SG: "TP Hồ Chí Minh",
  DN: "Đà Nẵng",
  HP: "Hải Phòng",
  CT: "Cần Thơ",
  "02": "Lào Cai",
  "03": "Hà Giang",
  "06": "Yên Bái",
  "07": "Tuyên Quang",
  "09": "Lạng Sơn",
  "13": "Quảng Ninh",
  "18": "Ninh Bình",
  "20": "Hà Tây",
  "21": "Thanh Hóa",
  "22": "Nghệ An",
  "23": "Hà Tĩnh",
  "24": "Quảng Bình",
  "25": "Quảng Trị",
  "26": "Thừa Thiên-Huế",
  "27": "Quảng Nam",
  "28": "Kon Tum",
  "29": "Quảng Ngãi",
  "30": "Gia Lai",
  "32": "Phú Yên",
  "33": "Đắk Lắk",
  "34": "Khánh Hòa",
  "35": "Lâm Đồng",
  "36": "Ninh Thuận",
  "37": "Tây Ninh",
  "39": "Đồng Nai",
  "40": "Bình Thuận",
  "41": "Long An",
  "43": "Bà Rịa-Vũng Tàu",
  "44": "An Giang",
  "45": "Đồng Tháp",
  "46": "Tiền Giang",
  "47": "Kiên Giang",
  "50": "Bến Tre",
  "51": "Trà Vinh",
  "52": "Sóc Trăng",
  "53": "Bắc Kạn",
  "54": "Bắc Giang",
  "55": "Bạc Liêu",
  "56": "Bắc Ninh",
  "57": "Bình Dương",
  "58": "Bình Phước",
  "59": "Cà Mau",
  "61": "Hải Dương",
  "63": "Hà Nam",
  "66": "Hưng Yên",
  "67": "Nam Định",
  "68": "Phú Thọ",
  "69": "Thái Nguyên",
  "70": "Vĩnh Phúc",
  "71": "Điện Biên",
  "73": "Hậu Giang",
};

/** Mã nước -> tên tiếng Việt. Chưa có thì trả nguyên mã. */
const QUOC_GIA: Record<string, string> = {
  VN: "Việt Nam",
  US: "Mỹ",
  SG: "Singapore",
  TH: "Thái Lan",
  JP: "Nhật Bản",
  KR: "Hàn Quốc",
  CN: "Trung Quốc",
  TW: "Đài Loan",
  HK: "Hồng Kông",
  AU: "Úc",
  DE: "Đức",
  FR: "Pháp",
  GB: "Anh",
  IN: "Ấn Độ",
  MY: "Malaysia",
  ID: "Indonesia",
  PH: "Philippines",
  LA: "Lào",
  KH: "Campuchia",
  MM: "Myanmar",
  RU: "Nga",
  CA: "Canada",
  NL: "Hà Lan",
  SE: "Thụy Điển",
  NO: "Na Uy",
  DK: "Đan Mạch",
  FI: "Phần Lan",
  CH: "Thụy Sĩ",
  AT: "Áo",
  BE: "Bỉ",
  ES: "Tây Ban Nha",
  IT: "Italia",
  PT: "Bồ Đào Nha",
  CZ: "Séc",
  PL: "Ba Lan",
  UA: "Ukraina",
  TR: "Thổ Nhĩ Kỳ",
  AE: "UAE",
  IL: "Israel",
  BR: "Brazil",
  MX: "Mexico",
  NZ: "New Zealand",
  ZA: "Nam Phi",
  EG: "Ai Cập",
  PK: "Pakistan",
  BD: "Bangladesh",
  IR: "Iran",
};

/**
 * Tên khu vực hiển thị cho một IP.
 *
 * VN: ưu tiên thành phố (đã chuẩn hoá), hụt thì mã region, hụt nữa là
 * "Việt Nam". Ngoài VN: tên nước tiếng Việt, không có trong bảng thì mã nước.
 * Trả null khi không tra được gì (IP nội bộ kiểu 10.x thường không có).
 */
export function khuVuc(ip: string, tra: TraCuu = traCuuMaxMind): string | null {
  const g = tra(ip);
  if (!g || !g.country) return null;
  const qg = g.country.toUpperCase();
  const thanhPho = chuanHoa(g.city || "");
  const ma = (g.region || "").toUpperCase();

  if (qg === "VN") {
    if (thanhPho && TINH_THEO_THANH_PHO[thanhPho]) {
      return TINH_THEO_THANH_PHO[thanhPho];
    }
    if (ma && TINH_THEO_MA[ma]) return TINH_THEO_MA[ma];
    return "Việt Nam";
  }
  return QUOC_GIA[qg] ?? qg;
}