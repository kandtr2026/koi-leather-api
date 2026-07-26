import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Koi Leather database (SQLite)...');

  await prisma.inventoryTransaction.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.craftingSpec.deleteMany();
  await prisma.sEORecord.deleteMany();
  await prisma.product.deleteMany();
  await prisma.rawMaterial.deleteMany();
  await prisma.category.deleteMany();

  // === CATEGORIES ===
  const watchStrapCat = await prisma.category.create({
    data: {
      code: 'WATCH_STRAP', name: 'Watch Strap', slug: 'watch-strap',
      specsSchema: JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#', type: 'object',
        properties: {
          lug_width_mm: { type: 'integer', minimum: 14, maximum: 26, title: 'Lug Width (mm)' },
          buckle_width_mm: { type: 'integer', minimum: 12, maximum: 24, title: 'Buckle Width (mm)' },
          short_strap_mm: { type: 'integer', minimum: 60, maximum: 130, title: 'Short Strap (mm)' },
          long_strap_mm: { type: 'integer', minimum: 60, maximum: 140, title: 'Long Strap (mm)' },
          taper_from_mm: { type: 'number', minimum: 2.0, maximum: 6.0, title: 'Taper From (mm)' },
          taper_to_mm: { type: 'number', minimum: 1.0, maximum: 4.0, title: 'Taper To (mm)' },
        }, required: ['lug_width_mm', 'buckle_width_mm'],
      }),
    },
  });

  await prisma.category.create({
    data: {
      code: 'WALLET', name: 'Ví', slug: 'vi',
      specsSchema: JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#', type: 'object',
        properties: {
          card_slots: { type: 'integer', minimum: 2, maximum: 16, title: 'Số ngăn thẻ' },
          cash_pockets: { type: 'integer', minimum: 1, maximum: 6, title: 'Số ngăn tiền' },
          folded_size: { type: 'string', title: 'Kích thước đóng', example: '11x9cm' },
        }, required: ['card_slots'],
      }),
    },
  });

  await prisma.category.create({
    data: {
      code: 'BELT', name: 'Thắt lưng', slug: 'that-lung',
      specsSchema: JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#', type: 'object',
        properties: {
          belt_width_cm: { type: 'number', minimum: 2.0, maximum: 5.0, title: 'Độ rộng mặt (cm)' },
          buckle_type: { type: 'string', enum: ['Pin buckle', 'Automatic'], title: 'Loại khóa' },
          strap_length_cm: { type: 'integer', minimum: 80, maximum: 140, title: 'Chiều dài (cm)' },
          hole_count: { type: 'integer', minimum: 5, maximum: 9, title: 'Số lỗ' },
        }, required: ['belt_width_cm', 'strap_length_cm'],
      }),
    },
  });

  console.log('  Categories created');

  // === RAW MATERIALS ===
  await prisma.rawMaterial.createMany({
    data: [
      { id: 'mat-epsom-navy', name: 'Da Epsom Navy - Haas', materialType: 'OUTER_LEATHER', supplier: 'Haas', unit: 'SQFT', color: 'Navy', totalQuantity: 20, availableQuantity: 20, unitCost: 450000, externalId: 'MAT-EPS-NAVY-001', syncStatus: 'SYNCED' },
      { id: 'mat-zermatt', name: 'Da lót Zermatt Beige - Haas', materialType: 'LINING_LEATHER', supplier: 'Haas', unit: 'SQFT', color: 'Beige', totalQuantity: 15, availableQuantity: 15, unitCost: 280000, externalId: 'MAT-ZER-BGE-002', syncStatus: 'SYNCED' },
      { id: 'mat-buttero', name: 'Da bò Buttero Havana - Walpier', materialType: 'OUTER_LEATHER', supplier: 'Walpier', unit: 'SQFT', color: 'Havana', totalQuantity: 25, availableQuantity: 25, unitCost: 380000, externalId: 'MAT-BUT-HAV-003', syncStatus: 'SYNCED' },
      { id: 'mat-pueblo', name: 'Da bò Pueblo - Badalassi Carlo', materialType: 'OUTER_LEATHER', supplier: 'Badalassi Carlo', unit: 'SQFT', color: 'Natural', totalQuantity: 18, availableQuantity: 18, unitCost: 320000, syncStatus: 'SYNCED' },
      { id: 'mat-chevre', name: 'Da lót Chevre Alran', materialType: 'LINING_LEATHER', supplier: 'Alran', unit: 'SQFT', color: 'Various', totalQuantity: 10, availableQuantity: 10, unitCost: 350000, syncStatus: 'SYNCED' },
      { id: 'mat-meisi-045', name: 'Chỉ Meisi 0.45mm', materialType: 'THREAD', supplier: 'Meisi', unit: 'METER', totalQuantity: 80, availableQuantity: 80, unitCost: 12000, syncStatus: 'SYNCED' },
      { id: 'mat-lin-hasard', name: 'Chỉ Lin Hasard 0.55mm', materialType: 'THREAD', supplier: 'Lin Hasard', unit: 'METER', totalQuantity: 50, availableQuantity: 50, unitCost: 15000, syncStatus: 'SYNCED' },
      { id: 'mat-buckle-34', name: 'Khóa inox mờ 3.4cm', materialType: 'BUCKLE', supplier: 'Craft Supplies', unit: 'PIECE', totalQuantity: 30, availableQuantity: 30, unitCost: 85000, syncStatus: 'SYNCED' },
      { id: 'mat-salpa', name: 'Độn Salpa 1.0mm - Salamander', materialType: 'INTERLINING', supplier: 'Salamander', unit: 'SQFT', totalQuantity: 40, availableQuantity: 40, unitCost: 95000, syncStatus: 'SYNCED' },
      { id: 'mat-velodon', name: 'Độn Velodon 0.8mm', materialType: 'INTERLINING', supplier: 'Salamander', unit: 'SQFT', totalQuantity: 25, availableQuantity: 25, unitCost: 85000, syncStatus: 'SYNCED' },
    ],
  });

  console.log('  Raw materials created');

  // === PRODUCTS ===
  const wallet = await prisma.product.create({
    data: {
      name: JSON.stringify({ vi: 'Ví đứng Epsom Navy', en: 'Epsom Navy Bifold Wallet' }),
      slug: 'vi-dung-epsom-navy', productType: 'WALLET', categoryId: (await prisma.category.findUnique({ where: { code: 'WALLET' } }))!.id,
      basePrice: 2500000, status: 'ACTIVE', externalId: 'KL-001', sku: 'WD-EPS-NAVY-001',
      technicalSpecs: JSON.stringify({ card_slots: 8, cash_pockets: 2, folded_size: '11x9cm' }),
      metaTitle: 'Ví đứng cao cấp Epsom Navy | Koi Leather',
      metaDescription: 'Ví da Epsom Navy của Haas (Pháp). 8 ngăn thẻ, 2 ngăn tiền. Thủ công 100%.',
      canonicalUrl: '/san-pham/vi-dung-epsom-navy',
    },
  });

  const belt = await prisma.product.create({
    data: {
      name: JSON.stringify({ vi: 'Thắt lưng da bò Buttero Havana', en: 'Buttero Havana Leather Belt' }),
      slug: 'that-lung-da-bo-buttero-havana', productType: 'BELT', categoryId: (await prisma.category.findUnique({ where: { code: 'BELT' } }))!.id,
      basePrice: 1800000, status: 'ACTIVE', externalId: 'KL-002', sku: 'TL-BUT-HAV-002',
      technicalSpecs: JSON.stringify({ belt_width_cm: 3.4, buckle_type: 'Pin buckle', strap_length_cm: 110, hole_count: 7 }),
      metaTitle: 'Thắt lưng da bò Buttero Havana | Koi Leather',
      metaDescription: 'Thắt lưng da bò Buttero từ Walpier (Ý), khóa inox, 7 lỗ điều chỉnh.',
      canonicalUrl: '/san-pham/that-lung-buttero-havana',
    },
  });

  const watchStrap = await prisma.product.create({
    data: {
      name: JSON.stringify({ vi: 'Watch Strap Epsom 20-18mm', en: 'Epsom Watch Strap 20-18mm' }),
      slug: 'watch-strap-epsom-20-18mm', productType: 'WATCH_STRAP', categoryId: watchStrapCat.id,
      basePrice: 1200000, status: 'ACTIVE', externalId: 'KL-003', sku: 'WS-EPS-20-18-003',
      technicalSpecs: JSON.stringify({ lug_width_mm: 20, buckle_width_mm: 18, short_strap_mm: 115, long_strap_mm: 75, taper_from_mm: 4.0, taper_to_mm: 2.0 }),
      metaTitle: 'Watch Strap Da Epsom 20-18mm | Koi Leather',
      metaDescription: 'Dây đồng hồ da Epsom Haas, lug 20mm, khóa 18mm, táp từ 4mm xuống 2mm.',
      canonicalUrl: '/san-pham/watch-strap-epsom-20-18',
    },
  });

  console.log('  Products created');

  // === CRAFTING SPECS ===
  const walletSpec = await prisma.craftingSpec.create({
    data: {
      productId: wallet.id,
      patternFiles: JSON.stringify([{ version: 'v2.1', url: '/patterns/wallet-epsom-v21.pdf', pieceCount: 7, format: 'PDF' }]),
      outerLeather: JSON.stringify({ material_name: 'Da Epsom Navy - Haas', tannery: 'Haas', sqft: 0.8, wastage_rate: 0.15, color: 'Navy', thickness_mm: 1.2 }),
      liningLeather: JSON.stringify({ material_name: 'Da lót Zermatt Beige - Haas', tannery: 'Haas', sqft: 0.5, wastage_rate: 0.1 }),
      interlining: JSON.stringify({ material_name: 'Độn Salpa 1.0mm', sqft: 0.4, thickness_mm: 1.0 }),
      dimensions: JSON.stringify({ folded_width_cm: 11, folded_height_cm: 9, card_slots: 8, cash_pockets: 2 }),
      craftingDetails: JSON.stringify({ thread: 'Meisi 0.45mm', pitch_mm: 3.38, edge_finishing: 'Fenice', stitching_type: 'Saddle Stitch' }),
      notes: 'Sử dụng chỉ beige cho đường khâu tương phản',
    },
  });

  const beltSpec = await prisma.craftingSpec.create({
    data: {
      productId: belt.id,
      patternFiles: JSON.stringify([{ version: 'v1.0', url: '/patterns/belt-buttero-v10.pdf', pieceCount: 3, format: 'PDF' }]),
      outerLeather: JSON.stringify({ material_name: 'Da bò Buttero Havana', tannery: 'Walpier', sqft: 2.5, wastage_rate: 0.15, thickness_mm: 3.0 }),
      interlining: JSON.stringify({ material_name: 'Độn Velodon 0.8mm', sqft: 0.6, thickness_mm: 0.8 }),
      dimensions: JSON.stringify({ strap_width_cm: 3.4, buckle_type: 'Pin buckle', strap_length_cm: 110, hole_count: 7, hole_spacing_cm: 2.5 }),
      craftingDetails: JSON.stringify({ thread: 'Lin Hasard 0.55mm', pitch_mm: 3.85, edge_finishing: 'Fenice', stitching_type: 'Saddle Stitch' }),
    },
  });

  const strapSpec = await prisma.craftingSpec.create({
    data: {
      productId: watchStrap.id,
      patternFiles: JSON.stringify([{ version: 'v3.0', url: '/patterns/strap-epsom-v30.dxf', pieceCount: 4, format: 'DXF' }]),
      outerLeather: JSON.stringify({ material_name: 'Da Epsom Navy', tannery: 'Haas', sqft: 0.4, wastage_rate: 0.1, thickness_mm: 1.2 }),
      liningLeather: JSON.stringify({ material_name: 'Da lót Chevre Alran', tannery: 'Alran', sqft: 0.25, wastage_rate: 0.1 }),
      dimensions: JSON.stringify({ lug_width_mm: 20, buckle_width_mm: 18, short_strap_mm: 115, long_strap_mm: 75, taper_from_mm: 4.0, taper_to_mm: 2.0 }),
      craftingDetails: JSON.stringify({ thread: 'Meisi 0.35mm', pitch_mm: 3.0, edge_finishing: 'Giặt gờ', stitching_type: 'Saddle Stitch' }),
    },
  });

  console.log('  Crafting specs created');

  // === VARIANTS ===
  const walletVar = await prisma.productVariant.create({
    data: {
      productId: wallet.id, sku: 'WD-EPS-NAVY-001', price: 2500000,
      stockStatus: 'MADE_TO_ORDER', isDefault: true,
      options: JSON.stringify({ leather: 'Epsom Navy', thread: 'Beige' }),
      craftingSpecId: walletSpec.id,
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: belt.id, sku: 'TL-BUT-HAV-002', price: 1800000,
      stockStatus: 'MADE_TO_ORDER', isDefault: true,
      options: JSON.stringify({ leather: 'Buttero Havana', buckle: 'Inox mờ 3.4cm' }),
      craftingSpecId: beltSpec.id,
    },
  });

  await prisma.productVariant.create({
    data: {
      productId: watchStrap.id, sku: 'WS-EPS-20-18-003', price: 1200000,
      stockStatus: 'MADE_TO_ORDER', isDefault: true,
      options: JSON.stringify({ leather: 'Epsom Navy', lugWidth: '20-18', length: '115/75' }),
      craftingSpecId: strapSpec.id,
    },
  });

  console.log('  Variants created');

  // === SEO ===
  await prisma.sEORecord.create({
    data: {
      entityType: 'PRODUCT', entityId: wallet.id,
      slug: 'san-pham/vi-dung-epsom-navy',
      jsonLd: JSON.stringify({ '@context': 'https://schema.org', '@type': 'Product', name: 'Ví đứng Epsom Navy', brand: { '@type': 'Brand', name: 'Koi Leather' } }),
      metaTitle: 'Ví đứng cao cấp Epsom Navy | Koi Leather',
      metaDescription: 'Ví da Epsom Navy của Haas (Pháp). Thủ công 100%.',
      sitemapPriority: 0.8, sitemapChangeFreq: 'monthly',
    },
  });

  // === PRODUCTION ORDER ===
  await prisma.productionOrder.create({
    data: {
      id: 'PO-001', variantId: walletVar.id, quantity: 2, status: 'COMPLETED',
      materialsAllocated: JSON.stringify([
        { material_id: 'mat-epsom-navy', material_name: 'Da Epsom Navy - Haas', qty_per_unit: 0.8, qty_consumed: 1.6, unit: 'sqft', cost_at_snapshot: 450000 },
        { material_id: 'mat-zermatt', material_name: 'Da lót Zermatt Beige - Haas', qty_per_unit: 0.5, qty_consumed: 1.0, unit: 'sqft', cost_at_snapshot: 280000 },
        { material_id: 'mat-salpa', material_name: 'Độn Salpa 1.0mm', qty_per_unit: 0.4, qty_consumed: 0.8, unit: 'sqft', cost_at_snapshot: 95000 },
        { material_id: 'mat-meisi-045', material_name: 'Chỉ Meisi 0.45mm', qty_per_unit: 2.0, qty_consumed: 4.0, unit: 'm', cost_at_snapshot: 12000 },
      ]),
      totalCostSnapshot: 1408000,
    },
  });

  console.log('  Production orders created');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
