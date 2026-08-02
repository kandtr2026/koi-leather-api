/**
 * Kiểm đường backend thật: khởi động Nest, gọi service như controller gọi.
 *   · findById  → có descriptionBlocks + descriptionAudit chưa?
 *   · cleanDescriptions(dryRun) → báo cáo đúng chưa, KHÔNG ghi DB?
 *   · update(descriptionBlocks) → HTML sinh lại từ khối chưa?
 *   · chốt an toàn: gửi khối rỗng cho sản phẩm đang có mô tả phải bị chặn.
 */
require("ts-node/register");
const { NestFactory } = require("@nestjs/core");
const { AppModule } = require("../src/app.module.ts");
const { ProductService } = require("../src/product/product.service.ts");

(async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error"],
  });
  const svc = app.get(ProductService);

  // ---- 1. đọc: khối suy ra tại chỗ cho mô tả cũ ----
  // Chọn hẳn một sản phẩm còn rác WordPress để thấy được bộ dọn làm gì.
  const rows = await svc.prisma.$queryRawUnsafe(
    `SELECT id, slug FROM "koi_free_style"."koi_products"
      WHERE "deletedAt" IS NULL
        AND description::text LIKE '%<h1%'
        AND description::text LIKE '%wp-content%'
      ORDER BY length(description::text) DESC
      LIMIT 1`,
  );
  const target = rows[0];
  console.log("Sản phẩm thử:", target.slug, target.id);
  const one = await svc.findById(target.id);
  console.log("=== 1. ĐỌC findById:", one.slug);
  console.log("   số khối        :", one.descriptionBlocks.length);
  console.log("   suy ra tại chỗ :", one.descriptionAudit.derivedFromHtml);
  console.log("   còn rác?       :", one.descriptionAudit.isLegacy,
    JSON.stringify({
      h1: one.descriptionAudit.duplicateH1,
      style: one.descriptionAudit.inlineStyle,
      anhChet: one.descriptionAudit.brokenImages,
    }));
  console.log("   khối đầu       :", JSON.stringify(one.descriptionBlocks[0]));
  console.log("   chữ sẽ bỏ      :", one.descriptionAudit.removedText.slice(0, 110));

  // ---- 2. dọn hàng loạt: chạy thử, không được ghi ----
  const before = await svc.findById(target.id);
  const rpt = await svc.cleanDescriptions({ dryRun: true, limit: 20 });
  console.log("\n=== 2. DỌN THỬ (dryRun) 20 sản phẩm");
  console.log("   dryRun         :", rpt.dryRun);
  console.log("   sẽ dọn         :", rpt.daDon);
  console.log("   bỏ qua vì sạch :", rpt.boQuaVdSach, "| vì rỗng:", rpt.boQuaVdRong);
  console.log("   ảnh chết bỏ    :", rpt.anhChetDaBo);
  console.log("   dung lượng     :", JSON.stringify(rpt.dungLuong));
  const after = await svc.findById(target.id);
  const unchanged =
    JSON.stringify(before.description) === JSON.stringify(after.description);
  console.log("   DB KHÔNG đổi   :", unchanged, unchanged ? "✓" : "✗ SAI — đã ghi!");

  // ---- 3. chốt an toàn: khối rỗng không được xoá trắng mô tả ----
  console.log("\n=== 3. CHỐT AN TOÀN: gửi khối rỗng");
  try {
    await svc.update(target.id, { descriptionBlocks: [] });
    console.log("   ✗ SAI — lẽ ra phải bị chặn");
  } catch (e) {
    console.log("   ✓ bị chặn:", String(e.message).slice(0, 90));
  }

  // ---- 4. ghi thật bằng khối, rồi hoàn nguyên ----
  console.log("\n=== 4. GHI bằng khối rồi hoàn nguyên");
  const originalDesc = before.description;
  const blocks = [
    { type: "heading", level: 2, html: "Thử ghi khối" },
    { type: "paragraph", html: "Đoạn <strong>đậm</strong> và <em>nghiêng</em>." },
    {
      type: "list",
      ordered: false,
      items: [
        { html: "Dòng cha", level: 0 },
        { html: "Dòng con", level: 1 },
      ],
    },
    // rác client gửi kèm: phải bị lọc sạch
    { type: "paragraph", html: '<script>alert(1)</script>Sau script' },
    { type: "image", url: "https://koileather.com/wp-content/x.jpg" },
    { type: "paragraph", html: '<a href="javascript:alert(1)">Link xấu</a>' },
  ];
  const upd = await svc.update(target.id, { descriptionBlocks: blocks });
  const readBack = await svc.findById(target.id);
  console.log("   HTML sinh ra   :");
  console.log("   ", (readBack.description.vi || readBack.description).replace(/\n/g, "\n    "));
  console.log("   còn rác?       :", readBack.descriptionAudit.isLegacy);
  console.log("   khối lưu trong DB:", readBack.descriptionBlocks.length, "khối (suy ra:", readBack.descriptionAudit.derivedFromHtml, ")");

  // hoàn nguyên đúng mô tả gốc
  await svc.prisma.koiProduct.update({
    where: { id: target.id },
    data: { description: originalDesc, descriptionBlocks: null },
  });
  const restored = await svc.findById(target.id);
  console.log(
    "   hoàn nguyên OK :",
    JSON.stringify(restored.description) === JSON.stringify(originalDesc),
  );

  await app.close();
})().catch((e) => {
  console.error("LỖI:", e);
  process.exit(1);
});
