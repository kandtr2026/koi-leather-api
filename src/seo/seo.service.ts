import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateSEORecordDto, UpdateSEORecordDto } from "./dto/seo-record.dto";

@Injectable()
export class SeoService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSEORecordDto) {
    const existing = await this.prisma.koiSEORecord.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException("Slug already exists");

    return this.prisma.koiSEORecord.create({
      data: {
        entityType: dto.entityType,
        entityId: dto.entityId,
        slug: dto.slug,
        slugHistory: "[]",
        jsonLd: (dto.jsonLd || {}) as any,
        ogTitle: dto.ogTitle,
        ogDescription: dto.ogDescription,
        ogImage: dto.ogImage,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        noIndex: dto.noIndex ?? false,
        sitemapPriority: dto.sitemapPriority
          ? parseFloat(dto.sitemapPriority)
          : undefined,
        sitemapChangeFreq: dto.sitemapChangeFreq,
      },
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.koiSEORecord.findFirst({
      where: { entityType: entityType as any, entityId },
    });
  }

  async findBySlug(slug: string) {
    const record = await this.prisma.koiSEORecord.findUnique({
      where: { slug },
    });
    if (!record) throw new NotFoundException("SEO record not found");
    return record;
  }

  async update(id: string, dto: UpdateSEORecordDto) {
    const record = await this.prisma.koiSEORecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException("SEO record not found");

    const data: any = {};

    // If slug changes, save old slug to history
    if (dto.slug && dto.slug !== record.slug) {
      const existing = await this.prisma.koiSEORecord.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) throw new ConflictException("Slug already in use");

      const history = (record.slugHistory as unknown as any[]) || [];
      history.push({
        slug: record.slug,
        redirectedAt: new Date().toISOString(),
      });
      data.slugHistory = history;
      data.slug = dto.slug;
    }

    if (dto.jsonLd) data.jsonLd = dto.jsonLd;
    if (dto.ogTitle !== undefined) data.ogTitle = dto.ogTitle;
    if (dto.ogDescription !== undefined) data.ogDescription = dto.ogDescription;
    if (dto.ogImage !== undefined) data.ogImage = dto.ogImage;
    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    if (dto.metaDescription !== undefined)
      data.metaDescription = dto.metaDescription;
    if (dto.noIndex !== undefined) data.noIndex = dto.noIndex;
    if (dto.sitemapPriority)
      data.sitemapPriority = parseFloat(dto.sitemapPriority);
    if (dto.sitemapChangeFreq) data.sitemapChangeFreq = dto.sitemapChangeFreq;

    return this.prisma.koiSEORecord.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.prisma.koiSEORecord.findUnique({ where: { id } });
    return this.prisma.koiSEORecord.delete({ where: { id } });
  }

  // === JSON-LD Generators ===

  async generateProductJsonLd(productId: string) {
    const product = await this.prisma.koiProduct.findUnique({
      where: { id: productId },
      include: {
        images: { where: { isPrimary: true }, take: 1 },
        variants: {
          select: {
            sku: true,
            title: true,
            price: true,
            stockStatus: true,
            hardwareOption: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException("Product not found");

    const name =
      (product.name as any)?.vi ||
      (product.name as any)?.en ||
      "Koi Leather Product";
    const offers: any[] = [];
    const variants = product.variants || [];

    if (variants.length > 0) {
      for (const v of variants) {
        if (v.price == null) continue;
        offers.push({
          "@type": "Offer",
          name: v.title || name,
          sku: v.sku,
          price: Number(v.price),
          priceCurrency: "VND",
          availability:
            v.stockStatus === "IN_STOCK"
              ? "https://schema.org/InStock"
              : "https://schema.org/LimitedAvailability",
          url: `https://koileather.vn/san-pham/${product.slug}?variant=${v.sku}`,
        });
      }
    }

    const schema: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      sku: (product as any).sku || product.id,
      description: (product.description as any)?.vi || "",
      brand: { "@type": "Brand", name: "Koi Leather" },
      image: product.images?.[0]?.url || undefined,
    };

    if (offers.length > 1) {
      const prices = offers.map((o: any) => o.price).filter(Boolean);
      schema.offers = {
        "@type": "AggregateOffer",
        priceCurrency: "VND",
        lowPrice: Math.min(...prices),
        highPrice: Math.max(...prices),
        offerCount: offers.length,
        offers,
      };
    } else if (offers.length === 1) {
      schema.offers = offers[0];
    } else if (product.basePrice != null) {
      schema.offers = {
        "@type": "Offer",
        price: Number(product.basePrice),
        priceCurrency: "VND",
        availability: "https://schema.org/InStock",
        url: `https://koileather.vn/san-pham/${product.slug}`,
      };
    }

    return schema;
  }

  async generateBreadcrumbJsonLd(items: { name: string; url: string }[]) {
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: `https://koileather.vn${item.url}`,
      })),
    };
  }

  async generateCraftActionJsonLd(productId: string) {
    const product = await this.prisma.koiProduct.findUnique({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException("Product not found");

    const name = (product.name as any)?.vi || "Sản phẩm da thủ công";

    return {
      "@context": "https://schema.org",
      "@type": "CraftAction",
      name: `Chế tác ${name}`,
      result: {
        "@type": "Product",
        name,
      },
      description:
        "Thủ công 100% — từ lạng da, đục xiên, khâu mũi yên đến sơn cạnh Fenice.",
    };
  }

  // === Sitemap Generator ===

  async generateSitemapXml(baseUrl: string): Promise<string> {
    const products = await this.prisma.koiProduct.findMany({
      where: { status: "ACTIVE" },
      select: { slug: true, updatedAt: true },
    });
    const seoRecords = await this.prisma.koiSEORecord.findMany({
      select: {
        slug: true,
        updatedAt: true,
        sitemapPriority: true,
        sitemapChangeFreq: true,
      },
    });

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage
    xml += `  <url><loc>${baseUrl}</loc><priority>1.0</priority><changefreq>weekly</changefreq></url>\n`;

    // Products
    for (const p of products) {
      xml += `  <url><loc>${baseUrl}/san-pham/${p.slug}</loc>`;
      xml += `<lastmod>${p.updatedAt.toISOString()}</lastmod>`;
      xml += `<priority>0.8</priority><changefreq>monthly</changefreq></url>\n`;
    }

    // SEO records
    for (const s of seoRecords) {
      xml += `  <url><loc>${baseUrl}/${s.slug}</loc>`;
      xml += `<lastmod>${s.updatedAt.toISOString()}</lastmod>`;
      xml += `<priority>${s.sitemapPriority || 0.5}</priority>`;
      xml += `<changefreq>${s.sitemapChangeFreq || "monthly"}</changefreq></url>\n`;
    }

    xml += "</urlset>";
    return xml;
  }
}
