/**
 * Dịch IP ra khu vực — dùng dữ liệu giả để test bảng tên, không cần internet.
 *
 * Các trường hợp lấy từ ĐO THỰC TẾ dữ liệu geoip-lite (VN trộn mã ISO "HN/SG"
 * với mã số FIPS "41/67", city lúc có dấu lúc không) — thay đổi bảng tên mà
 * quên test là bảng này không ai đọc ra.
 */
import { khuVuc, type TinHieu } from "./geo";

/** Bảng tra giả: ip -> tín hiệu. */
function tra(bang: Record<string, TinHieu>): (ip: string) => TinHieu | null {
  return (ip) => bang[ip] ?? null;
}

describe("khuVuc — Việt Nam", () => {
  it("thành phố chuẩn hoá được cả dạng có dấu / không dấu / thừa khoảng trắng", () => {
    const t = tra({ a: { country: "VN", city: "Hanoi" } });
    expect(khuVuc("a", t)).toBe("Hà Nội");
    expect(khuVuc("a", tra({ a: { country: "VN", city: "Ha Noi" } }))).toBe("Hà Nội");
  });

  it("cùng một thành phố viết lủng củng vẫn ra một tên", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", city: "Ho Chi Minh City" } }))).toBe("TP Hồ Chí Minh");
    expect(khuVuc("a", tra({ a: { country: "VN", city: "ho chi minh city" } }))).toBe("TP Hồ Chí Minh");
    expect(khuVuc("a", tra({ a: { country: "VN", city: "Saigon" } }))).toBe("TP Hồ Chí Minh");
  });

  it("thành phố có dấu ở bản dữ liệu cũ vẫn dịch ra", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", city: "huế" } }))).toBe("Thừa Thiên-Huế");
    expect(khuVuc("a", tra({ a: { country: "VN", city: "vũng tàu" } }))).toBe("Bà Rịa-Vũng Tàu");
  });

  it("thành phố thắng mã region khi cả hai có", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", region: "SG", city: "Da Nang" } }))).toBe("Đà Nẵng");
  });

  it("không có thành phố thì tra mã ISO", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", region: "SG" } }))).toBe("TP Hồ Chí Minh");
    expect(khuVuc("a", tra({ a: { country: "VN", region: "HN" } }))).toBe("Hà Nội");
    expect(khuVuc("a", tra({ a: { country: "VN", region: "DN" } }))).toBe("Đà Nẵng");
  });

  it("không có thành phố thì tra mã số FIPS", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", region: "41" } }))).toBe("Long An");
    expect(khuVuc("a", tra({ a: { country: "VN", region: "67" } }))).toBe("Nam Định");
    expect(khuVuc("a", tra({ a: { country: "VN", region: "21" } }))).toBe("Thanh Hóa");
  });

  it("mã lạ không đoán bừa — trả Việt Nam", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", city: "ban na an", region: "99" } }))).toBe("Việt Nam");
  });

  it("mã VN cũ (Hà Tây) vẫn dịch ra tên cũ để khách đọc hiểu", () => {
    expect(khuVuc("a", tra({ a: { country: "VN", region: "20" } }))).toBe("Hà Tây");
  });
});

describe("khuVuc — nước ngoài và lỗi tra", () => {
  it("tra được tên nước tiếng Việt", () => {
    expect(khuVuc("a", tra({ a: { country: "US" } }))).toBe("Mỹ");
    expect(khuVuc("a", tra({ a: { country: "SG" } }))).toBe("Singapore");
    expect(khuVuc("a", tra({ a: { country: "TH" } }))).toBe("Thái Lan");
  });

  it("nước chưa có trong bảng thì trả nguyên mã nước", () => {
    expect(khuVuc("a", tra({ a: { country: "ZZ" } }))).toBe("ZZ");
  });

  it("không tra được (IP nội bộ 10.x, chuỗi rác) trả null — panel vẽ dấu gạch", () => {
    expect(khuVuc("10.1.2.3", tra({}))).toBeNull();
    expect(khuVuc("khong-phai-ip", tra({}))).toBeNull();
  });
});