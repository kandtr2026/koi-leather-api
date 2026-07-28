export interface SeoOutput {
  metaTitle: string;
  metaDescription: string;
}

export function generateProductSeo(
  nameVi: string,
  categoryName?: string,
  basePrice?: number,
): SeoOutput {
  const safeName = nameVi || 'Sản phẩm';
  const categoryText = categoryName ? ` thuộc dòng ${categoryName}` : '';
  const priceText =
    basePrice != null && basePrice > 0
      ? ` với giá ${basePrice.toLocaleString('vi-VN')} VNĐ`
      : '';

  return {
    metaTitle: `${safeName} - Đồ Da Thủ Công Koi Leather`,
    metaDescription: `${safeName}${categoryText} chế tác thủ công từ da cao cấp${priceText}. Xem chi tiết thông số và đặt mua tại Koi Leather.`,
  };
}

export function generateCategorySeo(name: string): SeoOutput {
  const safeName = name || 'Danh mục sản phẩm';

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
  const safeName = productName || 'Sản phẩm da thủ công';
  const typeLabels: Record<string, string> = {
    STUDIO: 'Ảnh Studio',
    LIFESTYLE: 'Ảnh Lifestyle',
    CRAFTING: 'Ảnh Chế tác',
    TEXTURE: 'Ảnh Vân da',
  };
  const prefix = typeLabels[imageType] || 'Ảnh';
  const material = materialInfo ? ` - ${materialInfo}` : '';
  return `${prefix} ${safeName}${material} - Koi Leather`;
}
