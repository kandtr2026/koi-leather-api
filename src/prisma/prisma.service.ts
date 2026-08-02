import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

const JSON_FIELDS: Record<string, string[]> = {
  KoiProduct: ["name", "description", "technicalSpecs", "descriptionBlocks"],
  KoiProductVariant: ["options", "images"],
  KoiCraftingSpec: [
    "patternFiles",
    "outerLeather",
    "liningLeather",
    "interlining",
    "dimensions",
    "craftingDetails",
  ],
  KoiProductionOrder: ["materialsAllocated"],
  KoiSEORecord: ["slugHistory", "jsonLd"],
  KoiCategory: ["specsSchema"],
};

function appendPoolParams(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("connection_limit", "1");
    u.searchParams.set("pgbouncer", "true");
    // If using Supabase pooler, change port from 5432 to 6543
    if (u.hostname.endsWith("supabase.co") && u.port === "5432") {
      u.port = "6543";
    }
    return u.toString();
  } catch {
    return url;
  }
}

function isObject(value: any): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const isVercel = !!process.env.VERCEL_ENV;
    const rawUrl = process.env.DATABASE_URL || "";
    // On Vercel, append connection_limit to Supabase pooler URL.
    // Create DATABASE_URL_POOL env var on Vercel pointing to Supabase pooler (port 6543).
    const dbUrl = isVercel
      ? process.env.DATABASE_URL_POOL || appendPoolParams(rawUrl)
      : rawUrl;
    super({
      datasourceUrl: dbUrl,
      log: isVercel ? undefined : ["warn", "error"],
    });

    // Middleware: auto-parse JSON strings on read, auto-stringify on write
    this.$use(async (params, next) => {
      const modelFields = JSON_FIELDS[params.model as string];

      // Before: stringify JSON fields for create/update operations
      if (
        modelFields &&
        ["create", "update", "upsert", "createMany"].includes(params.action)
      ) {
        const data = params.args.data;
        if (data) {
          if (Array.isArray(data)) {
            for (const item of data) {
              for (const field of modelFields) {
                if (item[field] !== undefined && isObject(item[field])) {
                  item[field] = JSON.stringify(item[field]);
                }
              }
            }
          } else {
            for (const field of modelFields) {
              if (data[field] !== undefined && isObject(data[field])) {
                data[field] = JSON.stringify(data[field]);
              }
            }
          }
        }
      }

      const result = await next(params);

      // After: parse JSON strings back to objects for read operations
      if (
        modelFields &&
        [
          "findUnique",
          "findMany",
          "findFirst",
          "create",
          "update",
          "upsert",
        ].includes(params.action)
      ) {
        if (Array.isArray(result)) {
          for (const item of result) {
            for (const field of modelFields) {
              if (item[field] && typeof item[field] === "string") {
                try {
                  item[field] = JSON.parse(item[field]);
                } catch {}
              }
            }
          }
        } else if (
          result &&
          typeof result === "object" &&
          !Array.isArray(result)
        ) {
          for (const field of modelFields) {
            if (result[field] && typeof result[field] === "string") {
              try {
                result[field] = JSON.parse(result[field]);
              } catch {}
            }
          }
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    // Non-blocking connect: do not hold up Nest bootstrap in serverless cold starts.
    // Prisma lazily connects on first query anyway; we just log connectivity here.
    const started = Date.now();
    this.$connect()
      .then(() =>
        console.log(`[Prisma] connected in ${Date.now() - started}ms`),
      )
      .catch((e) => console.error("[Prisma] connect failed:", e?.message ?? e));
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
