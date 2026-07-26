import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const JSON_FIELDS: Record<string, string[]> = {
  Product: ['name', 'description', 'technicalSpecs'],
  ProductVariant: ['options', 'images'],
  CraftingSpec: ['patternFiles', 'outerLeather', 'liningLeather', 'interlining', 'dimensions', 'craftingDetails'],
  ProductionOrder: ['materialsAllocated'],
  SEORecord: ['slugHistory', 'jsonLd'],
  Category: ['specsSchema'],
};

function isObject(value: any): boolean {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super();

    // Middleware: auto-parse JSON strings on read, auto-stringify on write
    this.$use(async (params, next) => {
      const modelFields = JSON_FIELDS[params.model as string];

      // Before: stringify JSON fields for create/update operations
      if (modelFields && ['create', 'update', 'upsert', 'createMany'].includes(params.action)) {
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
      if (modelFields && ['findUnique', 'findMany', 'findFirst', 'create', 'update', 'upsert'].includes(params.action)) {
        if (Array.isArray(result)) {
          for (const item of result) {
            for (const field of modelFields) {
              if (item[field] && typeof item[field] === 'string') {
                try { item[field] = JSON.parse(item[field]); } catch {}
              }
            }
          }
        } else if (result && typeof result === 'object' && !Array.isArray(result)) {
          for (const field of modelFields) {
            if (result[field] && typeof result[field] === 'string') {
              try { result[field] = JSON.parse(result[field]); } catch {}
            }
          }
        }
      }

      return result;
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
