import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AiEditController } from "./ai-edit.controller";
import { AiEditResolver } from "./ai-edit.resolver";
import { AiEditService } from "./ai-edit.service";
import { AiEditWriter } from "./ai-edit.writer";

/**
 * Sửa nội dung chữ (bài viết/trang KoiBack): resolve/apply/revert/history.
 *
 * Phần "viết lại bằng AI (GPT)" đã gỡ 09/2026 theo yêu cầu (khó dùng, sẽ dựng
 * lại kiểu khác sau). Client OpenAI dùng chung nay ở OpenAiModule (src/openai).
 */
@Module({
  imports: [PrismaModule],
  controllers: [AiEditController],
  providers: [AiEditService, AiEditResolver, AiEditWriter],
})
export class AiEditModule {}
