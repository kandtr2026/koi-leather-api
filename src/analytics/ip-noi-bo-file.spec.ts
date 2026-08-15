/**
 * Đọc file data/ip-noi-bo.txt — phần dễ sai là đường dẫn và hành vi khi file
 * thiếu. Deploy thiếu includeFiles là file không theo lên — nguồn lọc mất im
 * lặng, mọi IP nội bộ lại lọt vào thống kê mà không có lỗi nào hiện ra.
 */
import * as path from "node:path";
import { docFileIpNoiBo } from "./analytics.service";

describe("docFileIpNoiBo — đọc file IP nội bộ", () => {
  it("đọc đúng đường dẫn data/ip-noi-bo.txt dưới thư mục làm việc", () => {
    const daDoc: string[] = [];
    const ra = docFileIpNoiBo("C:\\koi", (duong) => {
      daDoc.push(duong);
      return "1.2.3.4";
    });
    expect(daDoc).toEqual([path.join("C:\\koi", "data", "ip-noi-bo.txt")]);
    expect(ra).toBe("1.2.3.4");
  });

  it("file không đọc được thì trả null, không nem", () => {
    expect(
      docFileIpNoiBo(".", () => {
        throw new Error("ENOENT");
      }),
    ).toBeNull();
  });
});
