import { Catch, ExceptionFilter, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const meta = (exception.meta || {}) as Record<string, any>;

    switch (exception.code) {
      case 'P2002': {
        const target = (meta?.target as string[]) || [];
        const field = target.length > 0 ? target.join(', ') : 'unknown';
        const value = meta?.field_value || meta?.name || '';

        const message = field.startsWith('slug')
          ? `Slug "${value || ''}" đã tồn tại`
          : field.startsWith('sku')
            ? `SKU "${value || ''}" đã tồn tại`
            : `Giá trị trùng lặp: ${field}`;

        return response.status(HttpStatus.CONFLICT).json({
          statusCode: HttpStatus.CONFLICT,
          message,
          error: 'Conflict',
          fields: target,
        });
      }

      case 'P2025': {
        return response.status(HttpStatus.NOT_FOUND).json({
          statusCode: HttpStatus.NOT_FOUND,
          message: exception.message?.replace?.(/\n/g, ' ') || 'Không tìm thấy bản ghi',
          error: 'Not Found',
        });
      }

      case 'P2003': {
        return response.status(HttpStatus.BAD_REQUEST).json({
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Dữ liệu tham chiếu không hợp lệ: ${meta?.field_name || 'foreign key'}`,
          error: 'Bad Request',
        });
      }

      default: {
        this.logger.error(`Unhandled Prisma error: ${exception.code}`, exception.stack);
        return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Lỗi cơ sở dữ liệu, vui lòng thử lại sau',
          error: 'Internal Server Error',
        });
      }
    }
  }
}
