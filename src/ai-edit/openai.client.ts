import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";

/**
 * Cầu nối tới OpenAI. Mỏng có chủ ý — không cài SDK `openai`.
 *
 * VÌ SAO KHÔNG CÀI SDK: backend này chạy serverless trên Vercel, mỗi dependency
 * là thêm dung lượng bundle và thêm thời gian khởi động lạnh cho MỌI request của
 * cả API, kể cả những request không liên quan gì tới AI. Ở đây chỉ cần đúng một
 * lệnh POST tới một địa chỉ, mà Node 18+ đã có `fetch` sẵn.
 *
 * KEY CHỈ TỒN TẠI Ở ĐÂY, PHÍA SERVER. Không endpoint nào trả nó ra, không log
 * nào in nó. Đây là điều kiện không được phá khi sửa về sau: key OpenAI lọt ra
 * trình duyệt là ai mở admin cũng lấy được, rồi tiêu tiền trong tài khoản chủ
 * shop cho tới khi hết hạn mức.
 */
@Injectable()
export class OpenAiClient {
  private readonly log = new Logger(OpenAiClient.name);

  /**
   * Model mặc định. Đặt được qua biến môi trường OPENAI_MODEL để đổi không cần
   * deploy — hữu ích khi OpenAI ra model mới hoặc khai tử model cũ.
   */
  private get model(): string {
    return process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  }

  private get key(): string {
    return process.env.OPENAI_API_KEY?.trim() || "";
  }

  /**
   * Hạn chờ OpenAI, tính bằng mili-giây.
   *
   * PHẢI NHỎ HƠN CẢ BỐN HẠN BAO NGOÀI. Đây là số nằm trong cùng của một chuỗi
   * bốn tầng, và chỉ cần một tầng ngoài ngắn hơn là câu báo lỗi tử tế bên dưới
   * không bao giờ tới được chủ shop:
   *
   *   koi-domain-router  300s  ← proxy của koileather.com, dự án Vercel RIÊNG
   *   vercel.json ở đây  300s
   *   trình duyệt admin  260s  ← index.html, hàm aiXemTruoc
   *   hạn này            240s
   *
   * Tầng ngoài cùng là chỗ đã cắn một lần thật: koi-domain-router để 30 giây
   * trong khi ba tầng còn lại để 120-300, nên MỌI lượt sửa bài dài chết với
   * FUNCTION_INVOCATION_TIMEOUT — mà Vercel ghi nó vào log thành 502 với
   * timestamp lúc BẮT ĐẦU request, nhìn hệt như chính hàm này ném 502 sau hai
   * giây. Đổi số ở đây thì phải mở cả tệp vercel.json của router mà đối chiếu,
   * không chỉ vercel.json của dự án này.
   *
   * Để 4 phút là chừa 60 giây cho phần còn lại của một lượt: khởi động lạnh,
   * đọc bản ghi từ DB trước khi gọi, rồi dựng bảng so sánh trả về sau khi gọi.
   *
   * Chỉnh nhanh không cần deploy thì đặt OPENAI_TIMEOUT_MS trên Vercel. Số vượt
   * quá 270 giây bị kẹp lại, vì quá đó là Vercel cắt trước và mất câu báo lỗi.
   */
  private get hanChoMs(): number {
    const n = Number(process.env.OPENAI_TIMEOUT_MS || "");
    if (!Number.isFinite(n) || n <= 0) return 240_000;
    return Math.min(n, 270_000);
  }

  daCoKey(): boolean {
    return Boolean(this.key);
  }

  modelDangDung(): string {
    return this.model;
  }

  /**
   * Thu nhỏ ảnh Cloudinary NGAY TRÊN URL trước khi gửi cho model.
   *
   * Ảnh gốc trong thư viện to cỡ 2048px cho màn hình retina. Model không cần tới
   * mức đó: nó cần thấy hình dáng, chất da, đường chỉ, khoá.
   *
   * SỐ ĐO THẬT trên thư viện của shop (5 ảnh ngẫu nhiên, tải về đo dung lượng):
   *   144KB → 23KB · 271KB → 38KB · 156KB → 28KB · 308KB → 41KB · 311KB → 84KB
   * Tức nhẹ đi 4–8 lần, mà w_768 vẫn thừa chi tiết để thấy hình dáng, vân da,
   * đường chỉ và khoá — đúng những thứ model cần nhìn.
   *
   * KHÔNG đặt f_jpg. Thư viện đang là webp toàn bộ và OpenAI có nhận webp; ép sang
   * jpeg chỉ làm ảnh NẶNG THÊM (đo cùng một tấm: 38KB jpeg so với 28KB webp) mà
   * không đổi được gì.
   *
   * ẢNH KHÔNG PHẢI CLOUDINARY THÌ GIỮ NGUYÊN URL — có chủ ý, không phải bỏ sót.
   * Hai phần ba thư viện (2169/3269 tấm) nằm trên Supabase Storage. Supabase có
   * endpoint biến đổi ảnh (/render/image/) và nó đang bật, nhưng đã đo rồi KHÔNG
   * dùng, vì ba lý do:
   *   · Nó giải mã lại thành jpeg, nên ảnh nhỏ PHỒNG TO ra (đo được 34KB → 42KB).
   *   · Nó là tính năng theo gói dịch vụ. Ngày nào gói đổi thì URL trả 400, OpenAI
   *     không tải được ảnh và cả lượt gọi hỏng.
   *   · Với detail "low" thì token là số cố định bất kể ảnh to nhỏ, nên phần lợi
   *     duy nhất là vài trăm mili-giây tải về — mà phần tải đó nằm ở phía OpenAI.
   * Cân lại thì rủi ro lớn hơn cái lợi. Đổi ý thì sửa ở đúng hàm này.
   */
  private thuNhoAnh(url: string): string {
    const moc = "/image/upload/";
    if (!url.includes("res.cloudinary.com") || !url.includes(moc)) return url;
    const [dau, ...duoi] = url.split(moc);
    // q_auto: để Cloudinary tự chọn mức nén theo từng ảnh.
    return `${dau}${moc}w_768,q_auto/${duoi.join(moc)}`;
  }

  /**
   * Gọi một lượt sinh chữ và trả về JSON đã phân tích.
   *
   * response_format json_object: buộc model trả JSON hợp lệ thay vì văn xuôi có
   * kèm ```json. Không có nó thì phải tự dò và cắt khối mã trong chuỗi trả về —
   * việc đó sai lệch tuỳ lượt, mà mỗi lần sai là một lần chủ shop bấm nút không
   * ra gì.
   *
   * KHÔNG truyền `temperature`: một số model đời mới từ chối tham số này và trả
   * 400 cho cả request. Mặc định của OpenAI đủ dùng cho việc viết lại câu chữ,
   * nên không đáng đổi lấy nguy cơ hỏng khi chủ shop đổi model qua env.
   */
  async sinhJson(
    heThong: string,
    nguoiDung: string,
    soTokenToiDa = 8000,
    anh: string[] = [],
  ): Promise<{
    dulieu: unknown;
    model: string;
    soToken: number | null;
    soAnhDaXem: number;
  }> {
    if (!this.key) {
      throw new ServiceUnavailableException(
        "Chưa cấu hình OPENAI_API_KEY trên máy chủ. Vào Vercel → project koi-leather-api → Settings → Environment Variables để đặt.",
      );
    }

    // Hạn chờ đọc ở getter hanChoMs — xem giải thích ở đó về ràng buộc với
    // maxDuration trong vercel.json.
    const hanCho = this.hanChoMs;
    const dungSau = new AbortController();
    const hen = setTimeout(() => dungSau.abort(), hanCho);

    // Ảnh gửi kèm. Chuỗi rỗng/trùng bị loại ở đây thay vì tin bên gọi đã sạch:
    // một URL rỗng làm OpenAI trả 400 cho CẢ request, tức mất luôn phần chữ.
    const anhSach = Array.from(
      new Set(anh.filter((u) => typeof u === "string" && u.trim())),
    ).map((u) => this.thuNhoAnh(u.trim()));

    // detail "low": OpenAI xử ảnh ở mức thô, tốn ít token và nhanh hơn nhiều.
    // Đủ cho việc mình cần — nhận ra kiểu dáng, chất da, màu, bố cục. Muốn model
    // đọc chữ in trên sản phẩm thì mới cần "high", mà đó không phải việc ở đây.
    const noiDung = anhSach.length
      ? [
          { type: "text", text: nguoiDung },
          ...anhSach.map((url) => ({
            type: "image_url",
            image_url: { url, detail: "low" },
          })),
        ]
      : nguoiDung;

    const goi = (keNoiDung: unknown) =>
      fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.key}`,
        },
        signal: dungSau.signal,
        body: JSON.stringify({
          model: this.model,
          response_format: { type: "json_object" },
          max_completion_tokens: soTokenToiDa,
          messages: [
            { role: "system", content: heThong },
            { role: "user", content: keNoiDung },
          ],
        }),
      });

    let soAnhDaXem = anhSach.length;
    let res: Response;
    try {
      res = await goi(noiDung);

      // Model không đọc được ảnh thì OpenAI trả 400 và cả lượt mất trắng — kể cả
      // phần chữ vốn không liên quan gì tới ảnh. Model đặt được qua OPENAI_MODEL
      // nên chuyện này SẼ xảy ra vào ngày ai đó đổi sang model chỉ có chữ.
      // Thử lại một lần không kèm ảnh: chủ shop vẫn nhận được chữ mới, kém hơn
      // nhưng dùng được, thay vì một câu lỗi kỹ thuật.
      if (!res.ok && res.status === 400 && anhSach.length) {
        const than = await res.clone().text();
        if (/image|vision|multimodal|image_url/i.test(than)) {
          this.log.warn(
            `Model ${this.model} không nhận ảnh, gọi lại chỉ với chữ. Chi tiết: ${than.slice(0, 200)}`,
          );
          soAnhDaXem = 0;
          res = await goi(nguoiDung);
        }
      }
    } catch (e) {
      const loi = e as Error;
      if (loi.name === "AbortError") {
        throw new ServiceUnavailableException(
          `OpenAI trả lời quá lâu (hơn ${Math.round(hanCho / 1000)} giây). Chọn ít phần hơn trong một lượt — sửa riêng thân bài, rồi sửa riêng các thẻ SEO.`,
        );
      }
      throw new BadGatewayException(`Không gọi được OpenAI: ${loi.message}`);
    } finally {
      clearTimeout(hen);
    }

    if (!res.ok) {
      // Đọc thân lỗi để nói ĐÚNG chuyện gì xảy ra. OpenAI trả thông báo rõ ràng
      // ("incorrect api key", "insufficient_quota", "model not found") và chủ
      // shop tự xử được nếu thấy nó — còn "lỗi 401" thì không nói lên gì.
      let chiTiet = "";
      try {
        const t = await res.text();
        chiTiet = (JSON.parse(t)?.error?.message as string) || t.slice(0, 300);
      } catch {
        chiTiet = `HTTP ${res.status}`;
      }

      if (res.status === 401) {
        throw new ServiceUnavailableException(
          `OpenAI từ chối key: ${chiTiet}. Kiểm lại OPENAI_API_KEY trên Vercel — key đã thu hồi thì phải đặt key mới.`,
        );
      }
      if (res.status === 429) {
        throw new ServiceUnavailableException(
          `OpenAI chặn vì hết hạn mức hoặc gọi quá nhanh: ${chiTiet}`,
        );
      }
      throw new BadGatewayException(`OpenAI lỗi ${res.status}: ${chiTiet}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: { total_tokens?: number };
      model?: string;
    };

    const chon = json.choices?.[0];
    const chu = chon?.message?.content;
    if (!chu) {
      throw new BadGatewayException(
        "OpenAI trả về rỗng, không có nội dung nào.",
      );
    }

    // finish_reason 'length' = model bị cắt giữa dòng vì hết token. Chữ trả về
    // lúc đó là JSON dở, và nếu cứ thế ghi vào DB thì bài viết mất phần cuối.
    // Phải chặn ở đây, không để nó đi tiếp tới bước xem trước.
    if (chon?.finish_reason === "length") {
      throw new BadGatewayException(
        "Bài quá dài nên OpenAI bị cắt giữa dòng. Chọn ít trường hơn, hoặc tăng OPENAI_MAX_TOKENS.",
      );
    }

    let dulieu: unknown;
    try {
      dulieu = JSON.parse(chu);
    } catch {
      throw new BadGatewayException(
        "OpenAI trả về chuỗi không phải JSON hợp lệ. Thử lại lượt nữa.",
      );
    }

    return {
      dulieu,
      model: json.model || this.model,
      soToken: json.usage?.total_tokens ?? null,
      soAnhDaXem,
    };
  }
}
