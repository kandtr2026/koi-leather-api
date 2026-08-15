/**
 * Lọc IP nội bộ — phần dễ sai nhất là biên của CIDR và dạng IPv4-mapped.
 *
 * Sai ở đây KHÔNG báo lỗi: IP nội bộ lọt vào là mọi con số phồng lên im lặng,
 * còn IP khách bị loại nhầm là mất hẳn lượt xem — không cách nào lấy lại vì
 * lọc ngay LÚC GHI. Nên biên phải chốt bằng test.
 */
import { docIpNoiBo, gopIpNoiBo, laIpNoiBo } from "./ip-noi-bo";

describe("docIpNoiBo — phân tích chuỗi cấu hình", () => {
  it("chuỗi rỗng / chưa đặt biến ra danh sách rỗng, không nem", () => {
    expect(docIpNoiBo(undefined)).toEqual([]);
    expect(docIpNoiBo(null)).toEqual([]);
    expect(docIpNoiBo("")).toEqual([]);
    expect(docIpNoiBo("  ")).toEqual([]);
  });

  it("tách theo phẩy, khoảng trắng, chấm phẩy và xuống dòng", () => {
    const ds = docIpNoiBo("1.2.3.4, 5.6.7.8;9.10.11.12\n13.14.15.16");
    expect(ds.map((v) => v.bit)).toEqual([32, 32, 32, 32]);
  });

  it("bỏ chú thích sau dấu #", () => {
    const ds = docIpNoiBo("1.2.3.4 # may chu nha\n# dong chu thich\n2.3.4.5");
    expect(ds).toHaveLength(2);
  });

  it("bỏ mục rác (không phải IP, bán kính rỗng/lạ) nhưng giữ mục hợp lệ quanh nó", () => {
    const ds = docIpNoiBo("9.9.9.9, abc, 1.2.3.4/33, 5.6.7.8/, 7.7.7.7/0");
    expect(ds.map((v) => [v.bit, v.bytes.toString("hex")])).toEqual([
      [32, "00000000000000000000ffff09090909"],
      [0, "00000000000000000000ffff07070707"],
    ]);
    // /0 là bán kính hợp lệ (khớp MỌI IP) — giữ lại, không phải rác.
    expect(laIpNoiBo("123.45.67.89", ds)).toBe(true);
    expect(laIpNoiBo("abc", ds)).toBe(false);
  });

  it("IPv6 có nén :: và bán kính CIDR", () => {
    const ds = docIpNoiBo("2001:db8::1/64");
    expect(ds).toHaveLength(1);
    expect(ds[0].bit).toBe(64);
    expect(ds[0].bytes.toString("hex").startsWith("20010db8")).toBe(true);
  });

  it("IPv4 map sang ::ffff:a.b.c.d — 10 byte đầu = 0, byte 10-11 = ff", () => {
    const [v] = docIpNoiBo("192.168.1.1");
    expect(v.bytes.toString("hex")).toBe("00000000000000000000ffffc0a80101");
    expect(v.bit).toBe(32);
  });
});

describe("gopIpNoiBo — gộp biến môi trường với file cấu hình", () => {
  it("gộp đủ cả hai nguồn, không đếm trùng nhau", () => {
    const ds = gopIpNoiBo("1.2.3.4, 10.0.0.0/8", "10.0.0.0/8 # trung voi env\n192.168.1.0/24");
    const cacBit = ds.map((v) => v.bit);
    expect(cacBit.sort((a, b) => a - b)).toEqual([8, 8, 24, 32]);
    expect(laIpNoiBo("192.168.1.7", ds)).toBe(true);
    expect(laIpNoiBo("1.2.3.4", ds)).toBe(true);
  });

  it("thiếu một nguồn vẫn ra danh sách nguồn còn lại, không nem", () => {
    expect(gopIpNoiBo(undefined, "5.6.7.8")).toHaveLength(1);
    expect(gopIpNoiBo("5.6.7.8", null)).toHaveLength(1);
    expect(gopIpNoiBo(undefined, undefined)).toEqual([]);
  });

  it("file toàn chú thích và rác thì chỉ còn phần env hợp lệ", () => {
    const ds = gopIpNoiBo("1.2.3.4", "# dong chu thich\nkhong-phai-ip");
    expect(ds).toHaveLength(1);
  });
});

describe("laIpNoiBo — so khớp", () => {
  const ds = docIpNoiBo("1.2.3.4, 10.0.0.0/8, 192.168.1.0/24, 2001:db8::/32");

  it("địa chỉ đơn khớp đúng, không khớp hàng xóm", () => {
    expect(laIpNoiBo("1.2.3.4", ds)).toBe(true);
    expect(laIpNoiBo("1.2.3.5", ds)).toBe(false);
  });

  it("CIDR /8 khớp trong dải, chặn ngoài dải", () => {
    expect(laIpNoiBo("10.1.2.3", ds)).toBe(true);
    expect(laIpNoiBo("10.255.255.255", ds)).toBe(true);
    expect(laIpNoiBo("11.0.0.1", ds)).toBe(false);
  });

  it("CIDR /24 khớp biên trên và biên dưới", () => {
    expect(laIpNoiBo("192.168.1.0", ds)).toBe(true);
    expect(laIpNoiBo("192.168.1.255", ds)).toBe(true);
    expect(laIpNoiBo("192.168.2.1", ds)).toBe(false);
  });

  it("IPv4-mapped (::ffff:1.2.3.4) khớp với mục IPv4 như một", () => {
    expect(laIpNoiBo("::ffff:1.2.3.4", ds)).toBe(true);
    expect(laIpNoiBo("::ffff:192.168.1.7", ds)).toBe(true);
    expect(laIpNoiBo("::ffff:192.168.2.7", ds)).toBe(false);
  });

  it("IPv6 CIDR khớp theo tiền tố", () => {
    expect(laIpNoiBo("2001:db8::1", ds)).toBe(true);
    expect(laIpNoiBo("2001:db9::1", ds)).toBe(false);
  });

  it("Bit chẵn lẻ không phân biệt: /25 khớp nửa /24 đầu", () => {
    const ds25 = docIpNoiBo("203.0.113.128/25");
    expect(laIpNoiBo("203.0.113.128", ds25)).toBe(true);
    expect(laIpNoiBo("203.0.113.200", ds25)).toBe(true);
    expect(laIpNoiBo("203.0.113.127", ds25)).toBe(false);
    expect(laIpNoiBo("203.0.113.255", ds25)).toBe(true);
  });

  it("chuỗi rác không khớp, danh sách rỗng không khớp gì", () => {
    expect(laIpNoiBo("khong-phai-ip", ds)).toBe(false);
    expect(laIpNoiBo("", ds)).toBe(false);
    expect(laIpNoiBo("1.2.3.4", [])).toBe(false);
  });
});