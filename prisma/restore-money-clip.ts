import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const SKU = 'PK-money-clip-epsom-2QZ4';
  const SLUG = 'money-clip-epsom-pink';

  const existing = await prisma.koiProduct.findFirst({ where: { sku: SKU } });

  if (existing) {
    if (existing.isDeleted) {
      await prisma.koiProduct.update({
        where: { id: existing.id },
        data: { isDeleted: false, deletedAt: null },
      });
      console.log(`Restored product "Money Clip Epsom Pink" (ID: ${existing.id})`);
    } else {
      console.log(`Product already exists and is active (ID: ${existing.id})`);
    }
    return;
  }

  // Ensure ACCESSORY category exists
  let accessoryCat = await prisma.koiCategory.findUnique({ where: { code: 'ACCESSORY' } });
  if (!accessoryCat) {
    accessoryCat = await prisma.koiCategory.create({
      data: {
        code: 'ACCESSORY',
        name: 'Phụ kiện da',
        slug: 'phu-kien-da',
        specsSchema: JSON.stringify({
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            material: { type: 'string', title: 'Chất liệu da' },
            color: { type: 'string', title: 'Màu sắc' },
            dimensions_mm: { type: 'string', title: 'Kích thước (mm)' },
          },
        }),
      },
    });
    console.log('  Created ACCESSORY category');
  }

  const product = await prisma.koiProduct.create({
    data: {
      name: JSON.stringify({ vi: 'Money Clip Epsom Pink', en: 'Money Clip Epsom Pink' }),
      slug: SLUG,
      productType: 'ACCESSORY',
      categoryId: accessoryCat.id,
      sku: SKU,
      basePrice: 1200000,
      priceMin: 1200000,
      priceMax: 1200000,
      status: 'ACTIVE',
      technicalSpecs: JSON.stringify({ material: 'Da Epsom Haas', color: 'Pink', dimensions_mm: '60x25' }),
      metaTitle: 'Money Clip Epsom Pink | Koi Leather',
      metaDescription: 'Kẹp tiền da Epsom Pink cao cấp từ Haas (Pháp). Thủ công 100%. Phụ kiện thời trang nam.',
      canonicalUrl: '/san-pham/money-clip-epsom-pink',
      categoryLinks: { create: { categoryId: accessoryCat.id } },
    },
  });

  await prisma.koiProductVariant.create({
    data: {
      productId: product.id,
      sku: SKU,
      price: 1200000,
      stockStatus: 'MADE_TO_ORDER',
      isDefault: true,
      options: JSON.stringify({ leather: 'Epsom Pink', finish: 'Sơn cạnh Fenice' }),
    },
  });

  await prisma.koiSEORecord.create({
    data: {
      entityType: 'PRODUCT',
      entityId: product.id,
      slug: 'san-pham/money-clip-epsom-pink',
      jsonLd: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: 'Money Clip Epsom Pink',
        brand: { '@type': 'Brand', name: 'Koi Leather' },
      }),
      metaTitle: 'Money Clip Epsom Pink | Koi Leather',
      metaDescription: 'Kẹp tiền da Epsom Pink cao cấp từ Haas (Pháp). Thủ công 100%.',
      sitemapPriority: 0.8,
      sitemapChangeFreq: 'monthly',
    },
  });

  console.log(`Created product "Money Clip Epsom Pink" (ID: ${product.id}, SKU: ${SKU})`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
