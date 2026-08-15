import {
  BadGatewayException,
  Injectable,
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
   * PHẢI NHỎ HƠN maxDuration TRONG vercel.json (đang là 60 giây).
   *
   * Vì sao phải nhỏ hơn: nếu để hạn này lớn hơn giới hạn của nền tảng thì Vercel
   * cắt hàm TRƯỚC, nên nhánh AbortError bên dưới không bao giờ chạy và chủ shop
   * nhận về lỗi 504 trống rỗng thay vì câu giải thích có hướng xử lý.
   *
   * Để 50 giây là chừa 10 giây cho phần còn lại của một lượt: khởi động lạnh,
   * đọc bản ghi từ DB trước khi gọi, rồi dựng bảng so sánh trả về sau khi gọi.
   *
   * Đổi maxDuration trong vercel.json thì phải đổi cả số này — hoặc đặt
   * OPENAI_TIMEOUT_MS trên Vercel để chỉnh không cần deploy. Số vượt quá 58 giây
   * bị kẹp lại, vì quá đó là Vercel cắt trước và mất câu báo lỗi tử tế.
   */
  private get hanChoMs(): number {
    const n = Number(process.env.OPENAI_TIMEOUT_MS || "");
    if (!Number.isFinite(n) || n <= 0) return 50_000;
    return Math.min(n, 58_000);
  }

  daCoKey(): boolean {
    return Boolean(this.key);
  }

  modelDangDung(): string {
    return this.model;
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
  ): Promise<{ dulieu: unknown; model: string; soToken: number | null }> {
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

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
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
            { role: "user", content: nguoiDung },
          ],
        }),
      });
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
    };
  }
}
