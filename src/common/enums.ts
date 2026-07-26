export enum ProductType {
  WALLET = 'WALLET',
  BELT = 'BELT',
  WATCH_STRAP = 'WATCH_STRAP',
  BAG = 'BAG',
  ACCESSORY = 'ACCESSORY',
}

export const ProductTypeLabel: Record<ProductType, string> = {
  [ProductType.WALLET]: 'Ví',
  [ProductType.BELT]: 'Thắt lưng',
  [ProductType.WATCH_STRAP]: 'Watch Strap',
  [ProductType.BAG]: 'Túi',
  [ProductType.ACCESSORY]: 'Phụ kiện',
};

export enum CategoryCode {
  WATCH_STRAP = 'WATCH_STRAP',
  WALLET = 'WALLET',
  BELT = 'BELT',
  BAG = 'BAG',
  ACCESSORY = 'ACCESSORY',
}

export const CategoryCodeLabel: Record<CategoryCode, string> = {
  [CategoryCode.WATCH_STRAP]: 'Dây đồng hồ',
  [CategoryCode.WALLET]: 'Ví / Bóp / Cardholder',
  [CategoryCode.BELT]: 'Thắt lưng',
  [CategoryCode.BAG]: 'Túi / Balo / Clutch',
  [CategoryCode.ACCESSORY]: 'Phụ kiện da',
};

export enum ProductStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export enum MaterialType {
  OUTER_LEATHER = 'OUTER_LEATHER',
  LINING_LEATHER = 'LINING_LEATHER',
  INTERLINING = 'INTERLINING',
  THREAD = 'THREAD',
  BUCKLE = 'BUCKLE',
  HARDWARE = 'HARDWARE',
}

export enum MaterialUnit {
  SQFT = 'SQFT',
  METER = 'METER',
  PIECE = 'PIECE',
  ROLL = 'ROLL',
}

export enum TransactionType {
  RECEIPT = 'RECEIPT',
  CONSUMPTION = 'CONSUMPTION',
  RESERVATION = 'RESERVATION',
  RELEASE = 'RELEASE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  IN_PRODUCTION = 'IN_PRODUCTION',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum EntityType {
  PRODUCT = 'PRODUCT',
  COLLECTION = 'COLLECTION',
  ARTICLE = 'ARTICLE',
  PAGE = 'PAGE',
}
