import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import * as path from "path";
import * as express from "express";

let cachedServer: any;
let bootstrapPromise: Promise<any> | null = null;

async function bootstrapServer() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log"],
    bodyParser: false,
  });

  // Đồng bộ với main.ts: request sửa bài chứa cả chữ trước và sau, nên các bài
  // WordPress dài vượt giới hạn JSON 100 KB mặc định của Express.
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
      "http://localhost:5173",
      "https://koileather.com",
      "https://www.koileather.com",
      "https://koileather.vn",
      "https://www.koileather.vn",
      "https://admin.koileather.vn",
      "https://koileather.vercel.app",
      "https://koifront.vercel.app",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  });

  app.use("/", express.static(path.join(process.cwd(), "public")));
  // SPA fallback — serve index.html for /admin/* (path-based routing).
  // Mirrors main.ts so production behaves like local.
  app.use("/admin", (_req: any, res: any) => {
    res.sendFile(path.join(process.cwd(), "public", "index.html"));
  });
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Swagger doc generation scans every controller/DTO and adds noticeable
  // cold-start latency. Skip it on production serverless; enable with
  // ENABLE_SWAGGER=1 if the docs are needed there.
  if (
    process.env.VERCEL_ENV !== "production" ||
    process.env.ENABLE_SWAGGER === "1"
  ) {
    const config = new DocumentBuilder()
      .setTitle("Koi Leather API")
      .setDescription("Headless Backend API for Koi Leather")
      .setVersion("1.0")
      .addTag("KoiProducts")
      .addTag("Media")
      .addServer("https://api.koileather.vn", "KoiProduction")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: { defaultModelsExpandDepth: -1, docExpansion: "list" },
    });
  }

  await app.init();

  // Vercel Node functions call the handler with native (req, res). The Nest
  // Express adapter instance is itself an (req, res) handler, so we invoke it
  // directly — do NOT wrap with serverless-http (that expects Lambda events).
  return app.getHttpAdapter().getInstance();
}

export async function handler(req: any, res: any) {
  if (!cachedServer) {
    // Cache the in-flight bootstrap promise so concurrent cold-start requests
    // all await the SAME initialization instead of each spinning up its own
    // Nest app + Prisma client (which caused intermittent 500s under load).
    if (!bootstrapPromise) {
      bootstrapPromise = bootstrapServer().catch((e) => {
        // Reset on failure so the next request can retry a clean bootstrap.
        bootstrapPromise = null;
        throw e;
      });
    }
    cachedServer = await bootstrapPromise;
  }
  return cachedServer(req, res);
}
