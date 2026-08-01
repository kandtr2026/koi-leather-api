export enum KoiProductType {
  WALLET = "WALLET",
  BELT = "BELT",
  WATCH_STRAP = "WATCH_STRAP",
  BAG = "BAG",
  ACCESSORY = "ACCESSORY",
}

export const ProductTypeLabel: Record<KoiProductType, string> = {
  [KoiProductType.WALLET]: "Ví",
  [KoiProductType.BELT]: "Thắt lưng",
  [KoiProductType.WATCH_STRAP]: "Watch Strap",
  [KoiProductType.BAG]: "Túi",
  [KoiProductType.ACCESSORY]: "Phụ kiện",
};

export enum KoiCategoryCode {
  WATCH_STRAP = "WATCH_STRAP",
  WALLET = "WALLET",
  BELT = "BELT",
  BAG = "BAG",
  ACCESSORY = "ACCESSORY",
}

export const CategoryCodeLabel: Record<KoiCategoryCode, string> = {
  [KoiCategoryCode.WATCH_STRAP]: "Dây đồng hồ",
  [KoiCategoryCode.WALLET]: "Ví / Bóp / Cardholder",
  [KoiCategoryCode.BELT]: "Thắt lưng",
  [KoiCategoryCode.BAG]: "Túi / Balo / Clutch",
  [KoiCategoryCode.ACCESSORY]: "Phụ kiện da",
};

export enum KoiProductStatus {
  DRAFT = "DRAFT",
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum MaterialType {
  OUTER_LEATHER = "OUTER_LEATHER",
  LINING_LEATHER = "LINING_LEATHER",
  INTERLINING = "INTERLINING",
  THREAD = "THREAD",
  BUCKLE = "BUCKLE",
  HARDWARE = "HARDWARE",
}

export enum MaterialUnit {
  SQFT = "SQFT",
  METER = "METER",
  PIECE = "PIECE",
  ROLL = "ROLL",
}

export enum TransactionType {
  RECEIPT = "RECEIPT",
  CONSUMPTION = "CONSUMPTION",
  RESERVATION = "RESERVATION",
  RELEASE = "RELEASE",
  ADJUSTMENT = "ADJUSTMENT",
}

export enum OrderStatus {
  PENDING = "PENDING",
  IN_PRODUCTION = "IN_PRODUCTION",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum EntityType {
  PRODUCT = "PRODUCT",
  COLLECTION = "COLLECTION",
  ARTICLE = "ARTICLE",
  PAGE = "PAGE",
}

export enum KoiImageType {
  STUDIO = "STUDIO",
  LIFESTYLE = "LIFESTYLE",
  CRAFTING = "CRAFTING",
  TEXTURE = "TEXTURE",
}

export const ImageTypeLabel: Record<KoiImageType, string> = {
  [KoiImageType.STUDIO]: "Studio",
  [KoiImageType.LIFESTYLE]: "Lifestyle",
  [KoiImageType.CRAFTING]: "Crafting",
  [KoiImageType.TEXTURE]: "Texture",
};

export const ImageTypeAltTemplate: Record<KoiImageType, string> = {
  [KoiImageType.STUDIO]: "Ảnh Studio {product_name} - Koi Leather",
  [KoiImageType.LIFESTYLE]: "Ảnh Lifestyle {product_name} - Koi Leather",
  [KoiImageType.CRAFTING]: "Ảnh Chế tác {product_name} - Koi Leather",
  [KoiImageType.TEXTURE]: "Ảnh Vân da {product_name} - Koi Leather",
};

/**
 * Nhóm màu chuẩn cho bộ lọc sản phẩm.
 *
 * Mỗi sản phẩm gắn MỘT nhóm (colorFamily) để lọc, và một colorHex thật để hiện
 * chấm màu. Gom về ~13 nhóm: nếu để hex tự do làm filter thì hàng chục sắc nâu
 * gần giống nhau sẽ khiến thanh lọc vô dụng. `hex` ở đây là màu ĐẠI DIỆN của
 * nhóm (dùng cho swatch trên filter khi sản phẩm chưa có colorHex riêng).
 *
 * Thứ tự = thứ tự hiển thị mặc định (trước khi backend sắp lại theo số lượng).
 */
export const COLOR_FAMILIES: { code: string; name: string; hex: string }[] = [
  { code: "DEN", name: "Đen", hex: "#1a1a1a" },
  { code: "NAU_DAM", name: "Nâu đậm", hex: "#4a2f1b" },
  { code: "NAU_DO", name: "Nâu đỏ", hex: "#8a4b2b" },
  { code: "VANG_BO", name: "Vàng bò", hex: "#b5814a" },
  { code: "GOLD", name: "Gold", hex: "#c9a24b" },
  { code: "KEM", name: "Kem", hex: "#e6d8bd" },
  { code: "TRANG", name: "Trắng", hex: "#f2efe9" },
  { code: "XAM", name: "Xám", hex: "#8d8d88" },
  { code: "NAVY", name: "Navy", hex: "#2b3a5b" },
  { code: "XANH_DUONG", name: "Xanh dương", hex: "#4f7fa8" },
  { code: "XANH_LA", name: "Xanh lá", hex: "#3c5a3a" },
  { code: "DO", name: "Đỏ", hex: "#9e2b25" },
  { code: "CAM", name: "Cam", hex: "#d1651f" },
  { code: "HONG", name: "Hồng", hex: "#d18aa0" },
  { code: "TIM", name: "Tím", hex: "#5a3f6b" },
];

export const COLOR_FAMILY_LABEL: Record<string, string> = Object.fromEntries(
  COLOR_FAMILIES.map((c) => [c.code, c.name]),
);

export const COLOR_FAMILY_HEX: Record<string, string> = Object.fromEntries(
  COLOR_FAMILIES.map((c) => [c.code, c.hex]),
);

export const COLOR_FAMILY_CODES = COLOR_FAMILIES.map((c) => c.code);
