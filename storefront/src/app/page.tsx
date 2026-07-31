import Link from 'next/link';
import Image from 'next/image';
import { imageUrl } from '@/lib/supabase';
import { priceLabel } from '@/lib/format';
import { getHome } from '@/lib/api';
import { homeCategories } from '@/lib/queries';
import { ContactBar } from '@/components/contact-bar';
import { ReplaceableImage } from '@/components/admin/replaceable-image';
import { zaloLink, phoneLink, prettyPhone } from '@/lib/contact';
import type { ProductWithImages } from '@/lib/types';

// Lời khách — tĩnh (site chưa có API đánh giá). Giữ giọng như bản thiết kế.
const REVIEWS = [
  { quote: 'Đường chỉ đều tăm tắp, cạnh da miết bóng. Cầm lên là biết hàng thủ công thật.', name: 'Anh Minh', role: 'Doanh nhân, Q.1' },
  { quote: 'Tư vấn tận tâm, chọn đúng màu da mình thích. Giao đúng hẹn, đóng gói sang.', name: 'Anh Khoa', role: 'Giám đốc, Thủ Đức' },
  { quote: 'Chiếc clutch Epsom dùng 2 năm vẫn như mới, lên nước rất đẹp.', name: 'Anh Tuấn', role: 'Kiến trúc sư' },
  { quote: 'Đặt khắc tên làm quà tặng sếp, ai cũng khen. Sẽ quay lại.', name: 'Chị Lan', role: 'Trưởng phòng' },
];

const SERVICES = [
  { title: 'Da nhập châu Âu', body: 'Alligator, Epsom, Swift — tuyển từ thuộc da danh tiếng.' },
  { title: 'May tay thủ công', body: 'Chỉ lanh se sáp, mũi khâu yên ngựa, miết cạnh bóng.' },
  { title: 'Giao & đổi trả', body: 'Nội thành 48h, kiểm hàng khi nhận, đổi trả 30 ngày.' },
  { title: 'Bảo hành trọn đời', body: 'Đường chỉ bảo hành trọn đời, chăm da định kỳ tại xưởng.' },
];

/** Ảnh chính + ảnh phụ (nếu có) của một sản phẩm, đã sắp thứ tự.
 *  Giữ thêm id ảnh chính (id1) + id sản phẩm (pid) để admin thay ảnh tại chỗ. */
function productImages(p: ProductWithImages) {
  const imgs = [...(p.product_images ?? [])].sort(
    (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order,
  );
  return {
    img1: imageUrl(imgs[0]?.storage_path),
    img2: imageUrl(imgs[1]?.storage_path),
    alt: imgs[0]?.alt ?? p.name,
    id1: imgs[0]?.id ?? null,
    pid: p.id,
  };
}

export default async function HomePage() {
  const [home, cats] = await Promise.all([getHome(), homeCategories(7)]);
  const products = home.featured.slice(0, 8);
  const quickCats = cats.slice(0, 4);
  // Ô bộ sưu tập: 3 danh mục kế tiếp; nếu hết thì mượn lại từ đầu.
  const tileCats = (cats.slice(4, 7).length === 3 ? cats.slice(4, 7) : cats.slice(0, 3));

  const hero = products[0] ? productImages(products[0]) : null;
  const editorial = products[1] ? productImages(products[1]) : hero;

  return (
    <div className="overflow-x-hidden">
      {/* ══ HERO ══ */}
      <section className="relative min-h-[520px] h-[min(86vh,780px)]">
        {hero?.img1 ? (
          <ReplaceableImage
            productId={hero.pid}
            imageId={hero.id1}
            className="absolute inset-0"
          >
            <Image
              src={hero.img1}
              alt={hero.alt}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </ReplaceableImage>
        ) : (
          <div className="absolute inset-0 bg-koi-surface" />
        )}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(18,18,16,0.72),rgba(18,18,16,0.15)_46%,rgba(18,18,16,0.35))]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-[clamp(44px,7vw,88px)] px-5 text-center text-[#f4f2ee]">
          <span className="inline-block rounded-full border border-[#f4f2ee]/50 px-4 py-1.5 text-[11px] uppercase tracking-[0.16em]">
            Bộ sưu tập nam · Thủ công 2026
          </span>
          <h1 className="mt-6 font-serif text-[clamp(42px,6.4vw,88px)] font-normal leading-[1.0] tracking-[-0.01em] text-[#f4f2ee]">
            Đồ da cá sấu
            <br />
            chế tác thủ công
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] text-[16px] leading-[1.7] text-[#e6e2da]">
            Da nhập châu Âu, may tay từng đường chỉ sáp bởi nghệ nhân Việt — bền bỉ cho ngày
            làm việc, lịch lãm cho bàn tiệc.
          </p>
          <div className="pointer-events-auto mt-8 flex flex-wrap justify-center gap-3.5">
            <Link
              href="/cua-hang/"
              className="press border border-[#f4f2ee] px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-[#f4f2ee] hover:bg-[#f4f2ee] hover:text-koi-ink"
            >
              Xem sản phẩm
            </Link>
            <a
              href={zaloLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="press border border-[#f4f2ee]/50 px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-[#f4f2ee] hover:bg-[#f4f2ee]/10"
            >
              Tư vấn Zalo
            </a>
          </div>
        </div>
      </section>

      {/* ══ DÃY DANH MỤC NHANH ══ */}
      <section className="grid grid-cols-2 gap-px border-b border-koi-line bg-koi-line md:grid-cols-4">
        {quickCats.map((c) => {
          const cover = imageUrl(c.cover_image);
          return (
            <Link
              key={c.id}
              href={`/san-pham/${c.slug}/`}
              className="group relative block aspect-[3/4] overflow-hidden bg-koi-surface"
            >
              {cover ? (
                <Image
                  src={cover}
                  alt={c.name}
                  fill
                  sizes="(max-width: 900px) 50vw, 25vw"
                  className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(18,18,16,0.6),transparent_55%)]" />
              <span className="absolute inset-x-0 bottom-6 text-center text-[14px] uppercase tracking-[0.16em] text-white">
                {c.name}
              </span>
            </Link>
          );
        })}
      </section>

      {/* ══ EDITORIAL — SAVOIR-FAIRE ══ */}
      <section className="reveal grid items-stretch md:grid-cols-2">
        {editorial?.img1 ? (
          <ReplaceableImage
            productId={editorial.pid}
            imageId={editorial.id1}
            className="relative min-h-[460px]"
          >
            <Image
              src={editorial.img1}
              alt={editorial.alt}
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              className="object-cover"
            />
          </ReplaceableImage>
        ) : (
          <div className="relative min-h-[460px] bg-koi-surface" />
        )}
        <div className="flex flex-col justify-center bg-koi-surface px-[clamp(40px,6vw,88px)] py-[clamp(40px,6vw,88px)]">
          <p className="mb-5 text-[12px] uppercase tracking-[0.16em] text-koi-orange-dark">Savoir-faire</p>
          <h2 className="font-serif text-[clamp(30px,3.4vw,46px)] font-normal leading-[1.08] tracking-[-0.01em]">
            Một tấm da,
            <br />
            một đôi tay nghệ nhân
          </h2>
          <p className="mt-6 max-w-[46ch] text-[15.5px] leading-[1.75] text-koi-ink/[0.78]">
            Da chọn thủ công, cắt theo thớ, khâu mũi yên ngựa bằng chỉ lanh se sáp và miết
            cạnh nhiều lớp tới khi mép da bóng như sơn mài. Một chiếc, một nghệ nhân — từ đầu
            tới cuối.
          </p>
          <Link
            href="/cua-hang/"
            className="press mt-9 self-start border border-koi-orange px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-koi-orange-dark hover:bg-koi-orange hover:text-koi-white"
          >
            Xem sản phẩm
          </Link>
        </div>
      </section>

      {/* ══ LƯỚI SẢN PHẨM ══ */}
      <section className="px-[clamp(18px,4vw,56px)] py-[clamp(56px,7vw,96px)]">
        <div className="reveal mb-[clamp(36px,4vw,56px)] text-center">
          <p className="mb-3.5 text-[12px] uppercase tracking-[0.16em] text-koi-orange-dark">Bộ sưu tập</p>
          <h2 className="font-serif text-[clamp(30px,3.6vw,52px)] font-normal leading-[1.04]">
            Tuyển chọn
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-[clamp(18px,2.2vw,34px)] md:grid-cols-4">
          {products.map((p) => {
            const { img1, img2, alt, id1 } = productImages(p);
            return (
              <Link key={p.id} href={`/cua-hang/${p.slug}/`} className="group block">
                <ReplaceableImage
                  productId={p.id}
                  imageId={id1}
                  className="relative aspect-[4/5] overflow-hidden bg-koi-surface"
                >
                  {img1 ? (
                    <Image
                      src={img1}
                      alt={alt}
                      fill
                      sizes="(max-width: 900px) 50vw, 25vw"
                      className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                    />
                  ) : null}
                  {img2 ? (
                    <Image
                      src={img2}
                      alt=""
                      fill
                      sizes="(max-width: 900px) 50vw, 25vw"
                      className="object-cover opacity-0 transition-opacity duration-[400ms] group-hover:opacity-100"
                    />
                  ) : null}
                  {p.on_sale ? (
                    <span className="absolute left-3 top-3 bg-koi-ink px-2.5 py-1.5 text-[10px] uppercase tracking-[0.1em] text-[#f4f2ee]">
                      Giảm giá
                    </span>
                  ) : null}
                </ReplaceableImage>
                <h3 className="mt-4 font-serif text-[19px] font-normal transition-colors group-hover:text-koi-orange-dark">
                  {p.name}
                </h3>
                <p className="mt-2 font-serif text-[18px] tabular-nums">{priceLabel(p)}</p>
              </Link>
            );
          })}
        </div>
        <div className="reveal mt-[clamp(40px,5vw,64px)] text-center">
          <Link
            href="/cua-hang/"
            className="press inline-block border border-koi-line px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-koi-ink hover:border-koi-ink"
          >
            Xem tất cả sản phẩm
          </Link>
        </div>
      </section>

      {/* ══ Ô BỘ SƯU TẬP ══ */}
      <section className="grid grid-cols-1 gap-px border-y border-koi-line bg-koi-line md:grid-cols-3">
        {tileCats.map((c) => {
          const cover = imageUrl(c.cover_image);
          return (
            <Link
              key={`tile-${c.id}`}
              href={`/san-pham/${c.slug}/`}
              className="group relative flex aspect-[4/5] flex-col items-center justify-end overflow-hidden bg-koi-surface pb-10"
            >
              {cover ? (
                <Image
                  src={cover}
                  alt={c.name}
                  fill
                  sizes="(max-width: 900px) 100vw, 33vw"
                  className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                />
              ) : null}
              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(18,18,16,0.6),transparent_60%)]" />
              <div className="relative text-center text-white">
                <h3 className="font-serif text-[clamp(24px,2.4vw,34px)] font-normal">{c.name}</h3>
                <span className="mt-4 inline-block border border-white px-6 py-2.5 text-[11px] uppercase tracking-[0.16em] transition-colors group-hover:border-koi-orange group-hover:bg-koi-orange-dark">
                  Khám phá
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* ══ BĂNG CHUYỀN LỜI KHÁCH ══ */}
      <section className="reveal overflow-hidden py-[clamp(48px,6vw,80px)]">
        <p className="mb-9 text-center text-[12px] uppercase tracking-[0.16em] text-koi-orange-dark">
          Khách hàng nói gì
        </p>
        <div className="k-marquee">
          <div className="k-marquee-track">
            {[...REVIEWS, ...REVIEWS].map((r, i) => (
              <div
                key={i}
                className="w-[340px] flex-none border border-koi-line px-7 py-6"
              >
                <p className="m-0 text-[14px] tracking-[2px] text-koi-orange">★★★★★</p>
                <p className="mt-3.5 text-[14.5px] leading-[1.7] text-koi-ink/[0.82]">{r.quote}</p>
                <p className="mt-4 font-serif text-[16px]">{r.name}</p>
                <p className="mt-1 text-[12px] text-koi-etain-deep">{r.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ DỊCH VỤ / CAM KẾT ══ */}
      <section className="mx-auto grid max-w-[1240px] grid-cols-2 gap-[clamp(28px,3vw,56px)] border-t border-koi-line px-[clamp(18px,4vw,56px)] py-[clamp(48px,6vw,80px)] md:grid-cols-4">
        {SERVICES.map((s) => (
          <div key={s.title} className="reveal text-center">
            <p className="mb-3 text-[13px] uppercase tracking-[0.16em]">{s.title}</p>
            <p className="text-[13.5px] leading-[1.7] text-koi-ink/70">{s.body}</p>
          </div>
        ))}
      </section>

      {/* ══ CTA ══ */}
      <section className="reveal relative overflow-hidden bg-koi-ink px-5 py-[clamp(64px,8vw,120px)] text-center text-[#f4f2ee]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_120%_at_50%_0%,rgba(207,106,48,0.28),transparent_60%)]" />
        <div className="relative">
          <p className="mb-4 text-[12px] uppercase tracking-[0.16em] text-koi-terracotta-300">
            Đặt riêng cùng nghệ nhân
          </p>
          <h2 className="mx-auto max-w-[20ch] font-serif text-[clamp(30px,4vw,56px)] font-normal leading-[1.04]">
            Sở hữu món đồ da của riêng bạn
          </h2>
          <p className="mx-auto mt-5 max-w-[48ch] text-[15.5px] leading-[1.7] text-[#d9d5cd]">
            Nhắn mẫu bạn thích và ngân sách — nghệ nhân tư vấn loại da, màu và kích thước phù hợp.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <a
              href={phoneLink}
              className="press border border-koi-terracotta-400 px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-[#f4f2ee] hover:bg-koi-orange-dark"
            >
              Gọi {prettyPhone()}
            </a>
            <a
              href={zaloLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="press border border-[#f4f2ee]/50 px-8 py-3.5 text-[13px] uppercase tracking-[0.16em] text-[#f4f2ee] hover:bg-[#f4f2ee]/10"
            >
              Nhắn Zalo
            </a>
          </div>
        </div>
      </section>

      <ContactBar />
    </div>
  );
}
