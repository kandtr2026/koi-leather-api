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
