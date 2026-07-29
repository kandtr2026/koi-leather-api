export interface SeoOutput {
  metaTitle: string;
  metaDescription: string;
}

export function generateProductSeo(
  nameVi: string,
  categoryName?: string,
  basePrice?: number,
): SeoOutput {
  const safeName = nameVi || "Sản phẩm";
  const categoryText = categoryName ? ` thuộc dòng ${categoryName}` : "";
  const priceText =
    basePrice != null && basePrice > 0
      ? ` với giá ${basePrice.toLocaleString("vi-VN")} VNĐ`
      : "";

  return {
    metaTitle: `${safeName} - Đồ Da Thủ Công Koi Leather`,
    metaDescription: `${safeName}${categoryText} chế tác thủ công từ da cao cấp${priceText}. Xem chi tiết thông số và đặt mua tại Koi Leather.`,
  };
}

export function generateCategorySeo(name: string): SeoOutput {
  const safeName = name || "Danh mục sản phẩm";

  return {
    metaTitle: `${safeName} - Đồ Da Thủ Công Koi Leather`,
    metaDescription: `Khám phá bộ sưu tập ${safeName} thủ công cao cấp tại Koi Leather. Đa dạng mẫu mã, chất liệu da nhập khẩu, bảo hành trọn đời.`,
  };
}

export function generateImageAltText(
  productName: string,
  imageType: string,
  materialInfo?: string,
): string {
  const safeName = productName || "Sản phẩm da thủ công";
  const typeLabels: Record<string, string> = {
    STUDIO: "Ảnh Studio",
    LIFESTYLE: "Ảnh Lifestyle",
    CRAFTING: "Ảnh Chế tác",
    TEXTURE: "Ảnh Vân da",
  };
  const prefix = typeLabels[imageType] || "Ảnh";
  const material = materialInfo ? ` - ${materialInfo}` : "";
  return `${prefix} ${safeName}${material} - Koi Leather`;
}

export function generateProductJsonLd(
  product: {
    name: string;
    slug: string;
    description?: string | null;
    basePrice?: number | null;
    priceMin?: number | null;
    priceMax?: number | null;
    sku?: string | null;
    images?: { url: string; altText?: string | null }[];
    category?: { name: string } | null;
  },
  baseUrl = "https://koileather.vn",
): Record<string, any> {
  const url = `${baseUrl}/san-pham/${product.slug}`;
  const availability =
    product.basePrice != null || product.priceMin != null
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  const ld: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name || "Sản phẩm Koi Leather",
    url,
    sku: product.sku || undefined,
    description: product.description?.slice(0, 500) || undefined,
    brand: {
      "@type": "Brand",
      name: "Koi Leather",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "VND",
      availability,
    },
  };

  if (product.basePrice != null) {
    ld.offers.lowPrice = product.basePrice;
    ld.offers.highPrice = product.basePrice;
  } else if (product.priceMin != null && product.priceMax != null) {
    ld.offers.lowPrice = product.priceMin;
    ld.offers.highPrice = product.priceMax;
  }

  if (product.category) {
    ld.category = product.category.name;
  }

  if (product.images && product.images.length > 0) {
    ld.image = product.images.map((img) => img.url);
  }

  return ld;
}
