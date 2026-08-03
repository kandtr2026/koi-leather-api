import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Response } from "express";

/**
 * KHÔNG cho CDN đệm phản hồi lỗi.
 *
 * Các đường /shop/* khai Cache-Control bằng decorator `@Header` — mà decorator
 * đó đặt header TRƯỚC khi handler chạy, nên nó dính luôn vào cả phản hồi lỗi.
 * Đo thật trên production: `/shop/categories/card-holder?page=1e999` trả
 * HTTP 500 kèm `Cache-Control: public, max-age=60, s-maxage=300`.
 *
 * Hậu quả nặng hơn cái lỗi 500 ban đầu: một lần nghẽn cơ sở dữ liệu (Vercel đặt
 * connection_limit=1) là CDN giữ nguyên trang lỗi đó 5 phút cho MỌI khách, dù
 * backend đã hồi phục ngay sau đó. Nếu Googlebot vào đúng lúc thì nó ghi nhận
 * lỗi cho một địa chỉ vẫn còn tốt.
 *
 * Bộ lọc này chỉ sửa header rồi trả lại đúng thân phản hồi mà Nest đã dựng —
 * không đổi mã trạng thái, không đổi thông điệp, nên không giấu lỗi đi đâu.
 * Riêng 404 vẫn cho đệm ngắn: nó là câu trả lời ĐÚNG và ổn định (slug không tồn
 * tại thì lát sau vẫn không tồn tại), lại là thứ bị dò nhiều nhất.
 *
 * PrismaExceptionFilter bắt hẹp hơn (@Catch một lớp lỗi cụ thể) nên Nest ưu
 * tiên nó trước cho lỗi Prisma; bộ này lo phần còn lại.
 */
@Catch()
export class KhongDemLoiFilter implements ExceptionFilter {
  private logger = new Logger(KhongDemLoiFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<{ url?: string }>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status === HttpStatus.NOT_FOUND) {
      res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60");
    } else {
      res.setHeader("Cache-Control", "no-store");
    }

    // Thân phản hồi: giữ nguyên của HttpException (đã sạch). Lỗi không phải
    // HttpException thì KHÔNG đưa message gốc ra ngoài — thông điệp lỗi của
    // Prisma/Node có chứa đường dẫn tuyệt đối trên máy chủ.
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      res
        .status(status)
        .json(
          typeof body === "string"
            ? { statusCode: status, message: body }
            : body,
        );
      return;
    }

    this.logger.error(
      `Lỗi chưa xử lý ở ${req?.url ?? "?"}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    res.status(status).json({
      statusCode: status,
      message: "Lỗi hệ thống, vui lòng thử lại sau",
      error: "Internal Server Error",
    });
  }
}
