import Link from 'next/link';
import Image from 'next/image';
import { imageUrl } from '@/lib/supabase';
import { priceLabel } from '@/lib/format';
import { ReplaceableImage } from '@/components/admin/replaceable-image';
import { ColorAdmin } from '@/components/admin/color-admin';
import type { ProductWithImages } from '@/lib/types';

export function ProductCard({ p }: { p: ProductWithImages }) {
  const cover = p.product_images?.find((i) => i.is_primary) ?? p.product_images?.[0];
  const src = imageUrl(cover?.storage_path);

  return (
   <>
    <Link href={`/cua-hang/${p.slug}/`} className="group block">
      <ReplaceableImage
        productId={p.id}
        imageId={cover?.id ?? null}
        className="relative aspect-square overflow-hidden bg-koi-cream"
      >
        {src ? (
          <Image
            src={src}
            alt={cover?.alt ?? p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
          />
        ) : null}
      </ReplaceableImage>

      <div className="pt-3">
        <h3 className="flex items-start gap-1.5 text-[15px] leading-snug text-koi-ink transition-colors group-hover:text-koi-orange-dark">
          {p.color_hex ? (
            <span
              aria-hidden
              className="mt-[5px] inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-koi-line"
              style={{ backgroundColor: p.color_hex }}
            />
          ) : null}
          <span>{p.name}</span>
        </h3>
        <p className="mt-1 text-[13px] tracking-wide text-koi-gray">{priceLabel(p)}</p>
      </div>
    </Link>

    {/* Pick màu (chỉ admin) — nằm NGOÀI <Link> để không lồng nút trong thẻ a */}
    <ColorAdmin productId={p.id} colorFamily={p.color_family} colorHex={p.color_hex} />
  </>
  );
}
