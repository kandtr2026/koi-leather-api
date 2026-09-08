import { Module } from "@nestjs/common";
import { OpenAiClient } from "./openai.client";

/**
 * Cung cấp OpenAiClient (cầu nối OpenAI, giữ key phía server) cho các module cần
 * gọi GPT: ads (Landing-SEO), seo-whitelist, image-library (sinh alt ảnh).
 *
 * Trước đây client này nằm trong AiEditModule. Tính năng "sửa câu chữ bằng AI"
 * đã gỡ 09/2026 (sẽ dựng lại kiểu khác sau), nên client dùng chung được tách
 * hẳn ra module riêng — module dùng nó không còn phải kéo theo cả cụm sửa
 * nội dung.
 */
@Module({
  providers: [OpenAiClient],
  exports: [OpenAiClient],
})
export class OpenAiModule {}
