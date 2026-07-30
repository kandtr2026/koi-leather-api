/**
 * Sinh cac bien the cua mot slug de tra database.
 *
 * Van de: WordPress luu slug o dang DA MA HOA khi tieu de chua ky tu
 * ngoai bang ma thong thuong, va dung CHU THUONG cho phan %xx:
 *   Ten:  "Neo Bag" viet bang ky tu Unicode in dam  ->  𝗡𝗲𝗼 𝗕𝗮𝗴
 *   Slug: "tui-%f0%9d%97%a1...-da-nubuck-handcraft"
 *   Mot bai viet tieng Han cung o dang nay.
 *
 * Next.js co the dua vao trang MOT TRONG HAI dang, tuy ngu canh:
 *   - Da ma hoa nhung viet HOA:  "tui-%F0%9D%97%A1..."   (generateMetadata)
 *   - Da giai ma thanh ky tu that: "tui-𝗡𝗲𝗼-𝗕𝗮𝗴-..."     (than trang)
 * Ca hai deu khong khop voi ban chu thuong trong database.
 *
 * Nen phai thu ca bon dang duoi day.
 */
export function slugVariants(slug: string): string[] {
  const variants = [slug];

  // 1. Ha chu thuong phan %XX - dung khi Next dua vao ban da ma hoa viet hoa
  const lowered = slug.replace(/%[0-9A-Fa-f]{2}/g, (m) => m.toLowerCase());
  variants.push(lowered);

  // 2. Giai ma thanh ky tu that
  let decoded = slug;
  try {
    decoded = decodeURIComponent(slug);
    variants.push(decoded);
  } catch {
    // Chuoi khong phai ma hoa hop le - giu nguyen
  }

  // 3. Ma hoa lai tu ban da giai ma, roi ha chu thuong.
  //    Ma hoa thang tu chuoi goc se hong: dau % bi bien thanh %25.
  try {
    variants.push(
      encodeURIComponent(decoded).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase())
    );
  } catch {
    // encodeURIComponent nem loi voi surrogate le - bo qua
  }

  return [...new Set(variants)];
}
