import { Injectable, Logger } from "@nestjs/common";

/**
 * Bắn tín hiệu "dữ liệu sản phẩm vừa đổi" sang storefront Next (koi-storefront)
 * để mặt tiền cập nhật NGAY, thay vì chờ hết hạn cache.
 *
 * VÌ SAO CẦN: storefront đã chuyển sang Cache Components (PPR) và cache dữ liệu
 * sản phẩm ~1 giờ (`cacheLife('hours')`) — đó là chỗ tiết kiệm chi phí Vercel
 * chính. Không có đường báo tin thì sửa giá/tồn/ẩn-hiện ở admin lên mặt tiền
 * chậm nhất một tiếng. Webhook này bỏ đánh đổi đó: cache vẫn dài (rẻ) mà vẫn
 * tươi tức thì.
 *
 * Storefront nhận ở `POST /api/revalidate` rồi gọi `revalidateTag('products')`.
 * Tag đó gắn trên MỌI fetch sản phẩm bên storefront (danh sách, facet, VÀ trang
 * chi tiết — xem `getProductBySlug` gắn cả `products` lẫn `product:{slug}`), nên
 * một lần dọn `products` là đủ phủ hết; `slug` chỉ để dọn hẹp hơn khi có sẵn.
 *
 * BA LUẬT BẤT DI BẤT DỊCH ở đây:
 *  1. **KHÔNG được làm hỏng thao tác lưu.** Webhook lỗi/timeout/mất mạng chỉ làm
 *     mặt tiền chậm cập nhật — tuyệt đối không được ném lên làm request admin
 *     trả lỗi. Vì vậy fire-and-forget + catch mọi thứ.
 *  2. **KHÔNG chặn response.** Không `await` ở nơi gọi; hàm trả void.
 *  3. **Thiếu env thì im lặng bỏ qua** (log một lần). Máy dev không cấu hình
 *     NEXT_REVALIDATE_URL là chuyện thường, không phải lỗi.
 */

/**
 * Trần chờ. Ngắn có chủ đích: đây là tín hiệu bắn-rồi-quên, storefront chỉ cần
 * NHẬN được là đủ (nó tự dọn cache trong nền). Chờ lâu chỉ giữ socket vô ích
 * trong một hàm serverless đang tính tiền theo thời gian sống.
 */
const HAN_CHO_MS = 5_000;

/** Slug hợp lệ: chữ/số/gạch nối. Chặn gửi rác sang storefront (nó cũng tự kiểm lại). */
const SLUG_HOP_LE = /^[a-z0-9-]{1,200}$/i;

@Injectable()
export class RevalidateService {
  private logger = new Logger(RevalidateService.name);

  /** Đã cảnh báo thiếu env chưa — log một lần thôi, khỏi ngập log ở máy dev. */
  private daCanhBaoThieuEnv = false;

  /**
   * Gọi sau khi dữ liệu sản phẩm đã lưu THÀNH CÔNG. Không await.
   *
   * @param slug slug sản phẩm nếu biết (để dọn hẹp `product:{slug}`); bỏ trống
   *             vẫn đúng vì tag chung `products` phủ cả trang chi tiết.
   */
  sanPham(slug?: string | null): void {
    const url = process.env.NEXT_REVALIDATE_URL?.trim();
    const secret = process.env.REVALIDATE_SECRET?.trim();

    if (!url || !secret) {
      if (!this.daCanhBaoThieuEnv) {
        this.daCanhBaoThieuEnv = true;
        this.logger.warn(
          "Thieu NEXT_REVALIDATE_URL hoac REVALIDATE_SECRET — bo qua webhook revalidate. " +
            "Mat tien se tu cap nhat khi cache het han (~1 gio).",
        );
      }
      return;
    }

    const body: { tag: string; slug?: string } = { tag: "products" };
    if (slug && SLUG_HOP_LE.test(slug)) body.slug = slug;

    // void: cố ý KHÔNG await — người gọi phải trả response admin ngay.
    void fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(HAN_CHO_MS),
    })
      .then((res) => {
        if (!res.ok) {
          // 401 = secret hai bên lệch nhau; 503 = storefront chưa cấu hình env.
          this.logger.warn(
            `Webhook revalidate tra ${res.status} (tag=products${body.slug ? `, slug=${body.slug}` : ""})`,
          );
        }
      })
      .catch((e: unknown) => {
        this.logger.warn(
          `Webhook revalidate that bai: ${e instanceof Error ? e.message : String(e)}`,
        );
      });
  }
}
