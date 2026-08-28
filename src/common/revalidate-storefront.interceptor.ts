import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { RevalidateService } from "./revalidate.service";

/**
 * Sau MỌI request GHI thành công trên controller được gắn, bắn webhook
 * revalidate sang storefront (xem RevalidateService để biết vì sao cần).
 *
 * VÌ SAO LÀ INTERCEPTOR chứ không gọi tay trong từng service method:
 * ProductService có hơn mười đường ghi (create, update, remove, restore,
 * toggleStatus, toggleFeatured, 4 đường biến thể, cleanDescriptions) và mọi
 * đường đó đều đổi thứ mặt tiền đang hiện. Gọi tay thì (a) phải chèn vào giữa
 * logic transaction của một tệp 1.500 dòng, và (b) đường ghi THÊM SAU NÀY sẽ bị
 * quên — mà chế độ hỏng của việc quên là "mặt tiền hiện giá cũ", loại lỗi im
 * lặng đúng bằng thứ webhook này sinh ra để chữa. Đặt ở biên HTTP thì không
 * đường nào lọt.
 *
 * `tap` chỉ chạy nhánh next — request LỖI (ném exception) không bắn webhook, nên
 * điều kiện "chỉ báo sau khi commit DB thành công" được giữ đúng.
 *
 * Đọc-thì-không-bắn: lọc theo method để GET/HEAD không kích hoạt.
 *
 * Một request = một lần bắn. Các đường ghi hàng loạt (updateVariants,
 * cleanDescriptions) vốn đã là MỘT request nên không có chuyện dội webhook.
 */

const METHOD_GHI = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/** Một số endpoint POST chỉ chạy thử (dry-run) và KHÔNG ghi DB — không purge cache. */
function khongCoGhiThat(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return (body as { dryRun?: unknown }).dryRun === true;
}

/** Lấy slug từ body trả về nếu có — mỗi endpoint một hình dạng nên phải phòng bị. */
function laySlug(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const slug = (body as { slug?: unknown }).slug;
  return typeof slug === "string" && slug ? slug : undefined;
}

@Injectable()
export class RevalidateStorefrontInterceptor implements NestInterceptor {
  constructor(private readonly revalidate: RevalidateService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<{ method?: string }>();
    const laGhi = METHOD_GHI.has((req?.method ?? "").toUpperCase());

    return next.handle().pipe(
      tap((body: unknown) => {
        if (!laGhi || khongCoGhiThat(body)) return;
        // Không await, không ném — xem ba luật ở RevalidateService.
        this.revalidate.sanPham(laySlug(body));
      }),
    );
  }
}
