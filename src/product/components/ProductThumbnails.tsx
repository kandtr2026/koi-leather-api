import { useMemo } from 'react';

export interface ThumbnailInfo {
  id: string;
  url: string;
  alt?: string | null;
  isPrimary: boolean;
}

export interface ProductThumbnailsData {
  items: ThumbnailInfo[];
  remaining: number;
}

interface ProductThumbnailsProps {
  thumbnails?: ProductThumbnailsData | null;
  productName?: string;
  size?: number;
}

const THUMB_SIZE = 40;
const OVERLAP = 4;

export function ProductThumbnails({
  thumbnails,
  productName,
  size = THUMB_SIZE,
}: ProductThumbnailsProps) {
  const items = thumbnails?.items ?? [];
  const remaining = thumbnails?.remaining ?? 0;

  const containerStyle: React.CSSProperties = useMemo(
    () => ({
      display: 'flex',
      alignItems: 'center',
      gap: 0,
    }),
    [],
  );

  if (items.length === 0) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 6,
          background: '#f3f4f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: '#9ca3af',
        }}
      >
        —
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {items.map((img, index) => (
        <div
          key={img.id}
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            flexShrink: 0,
            position: 'relative',
            marginLeft: index > 0 ? -OVERLAP : 0,
            zIndex: items.length - index,
          }}
        >
          <img
            src={img.url}
            alt={img.alt ?? `${productName ?? 'Koi Leather product'} - ảnh ${index + 1}`}
            loading="lazy"
            width={size}
            height={size}
            style={{
              width: size,
              height: size,
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </div>
      ))}
      {remaining > 0 && (
        <div
          style={{
            width: size,
            height: size,
            borderRadius: 6,
            background: '#374151',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginLeft: -OVERLAP,
            zIndex: 0,
            position: 'relative',
            border: '1px solid #4b5563',
          }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}
