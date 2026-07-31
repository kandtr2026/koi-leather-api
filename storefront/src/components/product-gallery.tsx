'use client';

import { useState } from 'react';
import Image from 'next/image';
import { imageUrl } from '@/lib/supabase';
import { ReplaceableImage } from '@/components/admin/replaceable-image';
import type { ProductImage } from '@/lib/types';

/**
 * Thư viện ảnh sản phẩm.
 *
 * Ảnh đầu tải sẵn (priority) vì nó gần như luôn là ảnh lớn nhất màn hình
 * đầu — chậm ở đây là mất khách.
 *
 * Đổi ảnh dùng chuyển mờ kèm blur nhẹ thay vì thay tức thì: sản phẩm có
 * tới 35 ảnh, khách bấm qua lại liên tục để soi vân da. Thay đột ngột
 * bắt mắt tự nối hai khung hình, nhìn rẻ tiền. Blur làm hai trạng thái
 * hoà vào nhau nên mắt đọc thành MỘT chuyển biến, thay vì hai tấm ảnh
 * tráo chỗ.
 */
export function ProductGallery({
  images,
  name,
  productId,
}: {
  images: ProductImage[];
  name: string;
  productId: string;
}) {
  const [active, setActive] = useState(0);
  if (!images.length) return <div className="aspect-square bg-koi-cream" />;

  return (
    <div>
      <ReplaceableImage
        productId={productId}
        imageId={images[active].id}
        className="relative aspect-square overflow-hidden bg-koi-cream"
      >
        {/* Chỉ dựng ảnh ĐANG xem. Xếp chồng cả 35 ảnh để làm hiệu ứng
            chuyển mờ sẽ khiến trình duyệt tải hết ~5 MB ngay khi mở trang —
            đắt hơn nhiều so với chút mượt mà thu được.
            Dùng key để React thay mới, rồi @starting-style lo phần hiện ra. */}
        <Image
          key={images[active].storage_path}
          src={imageUrl(images[active].storage_path)!}
          alt={images[active].alt ?? name}
          fill
          priority
          quality={85}
          sizes="(max-width: 1024px) 100vw, 55vw"
          className="gallery-image object-cover"
        />
      </ReplaceableImage>

      {images.length > 1 && (
        <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((img, i) => (
            <button
              key={img.storage_path + i}
              onClick={() => setActive(i)}
              aria-label={`Xem ảnh ${i + 1}`}
              aria-current={i === active}
              className={`press relative aspect-square overflow-hidden bg-koi-cream transition-[opacity,transform] duration-150 ${
                i === active ? 'opacity-100 ring-1 ring-koi-orange' : 'opacity-65 hover:opacity-100'
              }`}
            >
              <Image
                src={imageUrl(img.storage_path)!}
                alt=""
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
