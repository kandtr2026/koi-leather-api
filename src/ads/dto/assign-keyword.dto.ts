import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsBoolean,
} from "class-validator";

export class AssignKeywordDto {
  /** ID của keyword trong keyword_pool. */
  @IsString()
  @IsNotEmpty()
  keywordId: string;

  /** ID campaign (gads_campaign.id). */
  @IsString()
  @IsNotEmpty()
  campaignId: string;

  /**
   * ID ad group (gads_ad_group.id).
   * Khi không truyền, service sẽ tự tìm default ad group "[Campaign Name] - General".
   */
  @IsString()
  @IsOptional()
  adGroupId?: string;

  /** broad | phrase | exact */
  @IsIn(["broad", "phrase", "exact"])
  @IsOptional()
  matchType?: string;

  /** true = negative keyword */
  @IsBoolean()
  @IsOptional()
  isNegative?: boolean;

  /** adgroup | campaign — chỉ có nghĩa khi isNegative=true */
  @IsIn(["adgroup", "campaign"])
  @IsOptional()
  negativeScope?: string;
}
