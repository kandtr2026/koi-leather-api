import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as path from "path";
import * as express from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Thân bài WordPress dài nhất hiện vượt 120 KB; thao tác sửa gửi cả bản cũ
  // lẫn bản mới để chống ghi đè đồng thời. Mức mặc định 100 KB của Express làm
  // các bài dài lỗi 413 trước khi tới DTO, nên cấp đủ cho tối đa vài trường chữ.
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ extended: true, limit: "5mb" }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableCors({
    origin: [
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3100",
      "http://localhost:5173",
      "https://koifront.vercel.app",
      "https://koileather.com",
      "https://www.koileather.com",
      "https://koileather.vn",
      "https://www.koileather.vn",
      "https://admin.koileather.vn",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  });

  // Serve admin dashboard at root
  app.use("/", express.static(path.join(process.cwd(), "public")));

  // SPA fallback — serve index.html for all /admin/* paths (path-based routing)
  app.use("/admin", (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });

  // Serve uploaded media
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  const config = new DocumentBuilder()
    .setTitle("Koi Leather API")
    .setDescription(
      "Headless Backend API for Koi Leather — Handcrafted Leather Goods Management System",
    )
    .setVersion("1.0")
    .addTag("KoiProducts", "Quản lý sản phẩm & thông số kỹ thuật JSONB")
    .addTag("Media", "Quản lý ảnh sản phẩm (Cloudinary CDN)")
    .addTag(
      "Raw Materials",
      "Quản lý nguyên liệu (da, chỉ, khóa) & đồng bộ tồn kho",
    )
    .addTag(
      "KoiProduction Orders",
      "Lệnh sản xuất & snapshot chi phí nguyên liệu",
    )
    .addTag("SEO", "Slug, JSON-LD Schema.org, OpenGraph, XML Sitemap")
    .addServer("http://localhost:3000", "Local development")
    .addServer("https://api.koileather.vn", "KoiProduction")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    swaggerOptions: { defaultModelsExpandDepth: -1, docExpansion: "list" },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\nKoi Leather API running on http://localhost:${port}`);
  console.log(`Admin dashboard: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs\n`);
}

export { bootstrap };

if (process.env.NODE_ENV !== "vercel") {
  bootstrap();
}
