/**
 * leads() cắt kỳ: `total` / `data` / `counts` phải cùng nói về MỘT khoảng.
 *
 * Vì sao cần test: panel Heoiu đặt `total` và `counts.new` cạnh nhau trên cùng
 * một hàng thẻ ("Qua form" và "Chưa xử lý", panel.js:1349-1350). Ba con số đó đi
 * ra từ ba truy vấn khác nhau trong cùng một hàm, nên chỉ cần một truy vấn quên
 * điều kiện lọc là hai thẻ cạnh nhau nói hai chuyện chống nhau — mà không có gì
 * trên màn hình cho biết con nào tính khoảng nào.
 *
 * Đây là tầng service, không phải hàm thuần tuý: nó gọi Prisma. Nên test soi
 * ĐIỀU KIỆN LỌC gửi xuống Prisma chứ không soi số trả về — số là việc của
 * Postgres, còn việc của hàm này là gửi xuống đúng câu hỏi.
 */
import { AnalyticsService } from "./analytics.service";
import { dauNgayVN } from "../common/ngay-vn";

/** Một dòng lead thô như Prisma trả về: id và product_id là BigInt. */
function dongLead(id: number, status = "new") {
  return {
    id: BigInt(id),
    name: "Khách " + id,
    phone: "0900000000",
    email: null,
    message: null,
    product_id: null,
    source: "form",
    status,
    note: null,
    created_at: new Date("2026-08-09T03:00:00Z"),
  };
}

/**
 * Prisma giả, ghi lại điều kiện lọc của TỪNG truy vấn để soi riêng.
 *
 * Ba truy vấn chạy song song qua Promise.all nên không thể dựa vào thứ tự gọi;
 * mỗi cái ghi vào một ô riêng.
 */
function prismaGia(
  dong = [dongLead(1)],
  nhom: { status: string; _count: { _all: number } }[] = [
    { status: "new", _count: { _all: 3 } },
  ],
) {
  const daGoi: {
    findMany?: Record<string, unknown>;
    count?: Record<string, unknown>;
    groupBy?: Record<string, unknown>;
  } = {};
  return {
    daGoi,
    leads: {
      findMany: async (arg: Record<string, unknown>) => {
        daGoi.findMany = arg;
        return dong;
      },
      count: async (arg: Record<string, unknown>) => {
        daGoi.count = arg;
        return dong.length;
      },
      groupBy: async (arg: Record<string, unknown>) => {
        daGoi.groupBy = arg;
        return nhom;
      },
    },
  };
}

function dichVu(prisma: ReturnType<typeof prismaGia>) {
  return new AnalyticsService(prisma as never);
}

/** Đọc mốc `created_at.gte` trong một điều kiện lọc, null nếu không có. */
function mocGte(where: unknown): Date | null {
  const w = where as { created_at?: { gte?: Date } } | undefined;
  return w?.created_at?.gte ?? null;
}

describe("leads() — counts phải cắt theo cùng kỳ với total", () => {
  it("groupBy NHẬN mốc kỳ, không đếm cả bảng", async () => {
    const p = prismaGia();
    await dichVu(p).leads({ days: 7 });

    // Đây là chính lỗi từng có: groupBy gọi không kèm where nên `counts` đếm
    // toàn bộ bảng từ 2018 trong khi `total` chỉ đếm 7 ngày.
    expect(mocGte(p.daGoi.groupBy?.where)).toBeInstanceOf(Date);
  });

  it("ba truy vấn dùng ĐÚNG CÙNG một mốc kỳ", async () => {
    const p = prismaGia();
    await dichVu(p).leads({ days: 30 });

    const a = mocGte(p.daGoi.findMany?.where);
    const b = mocGte(p.daGoi.count?.where);
    const c = mocGte(p.daGoi.groupBy?.where);
    expect(a).not.toBeNull();
    expect(+a!).toBe(+b!);
    expect(+a!).toBe(+c!);
  });

  it("days = 1 là đầu ngày HÔM NAY giờ Việt Nam, không phải 24 giờ trượt", async () => {
    const p = prismaGia();
    await dichVu(p).leads({ days: 1 });

    // Trừ thẳng Date.now() - 86400000 là cửa sổ 24 giờ trôi: cùng ghi "hôm nay"
    // mà panel này và panel lưu lượng đếm hai khoảng khác nhau.
    expect(+mocGte(p.daGoi.groupBy?.where)!).toBe(+dauNgayVN(0));
  });

  it("days = 7 lùi đúng 6 ngày (hôm nay là ngày thứ bảy của kỳ)", async () => {
    const p = prismaGia();
    await dichVu(p).leads({ days: 7 });
    expect(+mocGte(p.daGoi.count?.where)!).toBe(+dauNgayVN(6));
  });
});

describe("leads() — counts KHÔNG lọc theo trạng thái", () => {
  it("chọn tab 'won' thì groupBy vẫn đếm mọi trạng thái", async () => {
    const p = prismaGia();
    await dichVu(p).leads({ status: "won", days: 7 });

    // Lọc trạng thái vào groupBy là ba tab kia tụt về 0, tức mất luôn bảng đếm
    // dùng để bấm sang tab khác.
    expect(p.daGoi.groupBy?.where).not.toHaveProperty("status");
    // Nhưng bảng dòng và tổng thì PHẢI lọc.
    expect(p.daGoi.findMany?.where).toHaveProperty("status", "won");
    expect(p.daGoi.count?.where).toHaveProperty("status", "won");
  });

  it("trạng thái lạ coi như không lọc, không nhét chuỗi rác vào truy vấn", async () => {
    const p = prismaGia();
    await dichVu(p).leads({ status: "'; DROP TABLE leads; --" });
    expect(p.daGoi.findMany?.where).not.toHaveProperty("status");
  });
});

describe("leads() — kẹp days", () => {
  it("không truyền days là lấy TOÀN BỘ, giữ nguyên hành vi cũ", async () => {
    const p = prismaGia();
    const kq = await dichVu(p).leads({});

    expect(mocGte(p.daGoi.findMany?.where)).toBeNull();
    expect(mocGte(p.daGoi.groupBy?.where)).toBeNull();
    expect(kq.days).toBe(0);
  });

  it("days âm KHÔNG cho ra cửa sổ ở tương lai — hạ về toàn bộ", async () => {
    const p = prismaGia();
    // Mẫu `Number(x) || 30` của các route cũ không chặn số âm: days=-5 cho mốc
    // ngày ở tương lai và bảng rỗng trơn, nhìn hệt như mất dữ liệu.
    const kq = await dichVu(p).leads({ days: -5 });

    expect(mocGte(p.daGoi.findMany?.where)).toBeNull();
    expect(kq.days).toBe(0);
  });

  it("days vượt trần hạ về 365 và NÓI RA con số đã dùng", async () => {
    const p = prismaGia();
    const kq = await dichVu(p).leads({ days: 5000 });

    // Trả `days` ra ngoài để panel ghi đúng nhãn: âm thầm hạ trần mà vẫn để
    // panel ghi "5000 ngày" là nói dối chủ shop.
    expect(kq.days).toBe(365);
    expect(+mocGte(p.daGoi.count?.where)!).toBe(+dauNgayVN(364));
  });

  it("days thập phân bị cắt, không thả số thực xuống phép tính mốc", async () => {
    const p = prismaGia();
    const kq = await dichVu(p).leads({ days: 7.9 });
    expect(kq.days).toBe(7);
    expect(+mocGte(p.daGoi.count?.where)!).toBe(+dauNgayVN(6));
  });
});

describe("leads() — hình dạng phản hồi", () => {
  it("counts LUÔN đủ bốn trạng thái, kể cả khi kỳ không có dòng nào", async () => {
    const p = prismaGia([], []);
    const kq = await dichVu(p).leads({ days: 1 });

    // Thiếu khoá là panel vẽ thẻ trống thay vì thẻ số 0 — nhìn như tính năng
    // chưa chạy chứ không như "hôm nay chưa ai gửi form".
    expect(kq.counts).toEqual({ new: 0, contacted: 0, won: 0, lost: 0 });
  });

  it("id đổi sang Number, không để BigInt lọt ra JSON", async () => {
    const p = prismaGia([dongLead(42, "contacted")]);
    const kq = await dichVu(p).leads({ days: 7 });

    // JSON.stringify() ném TypeError khi gặp BigInt — lọt ra là cả phản hồi
    // thành 500, không phải chỉ thiếu một trường.
    expect(typeof kq.data[0].id).toBe("number");
    expect(kq.data[0].id).toBe(42);
    expect(() => JSON.stringify(kq)).not.toThrow();
  });

  it("gộp số đếm của cùng một trạng thái thay vì ghi đè", async () => {
    const p = prismaGia(
      [dongLead(1)],
      [
        { status: "new", _count: { _all: 2 } },
        { status: "won", _count: { _all: 5 } },
      ],
    );
    const kq = await dichVu(p).leads({ days: 7 });
    expect(kq.counts).toEqual({ new: 2, contacted: 0, won: 5, lost: 0 });
  });
});
