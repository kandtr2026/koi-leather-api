import { ArrayMaxSize, IsArray, IsOptional, IsUUID } from "class-validator";

export class SyncPushDto {
  /**
   * Danh sách KeywordCampaignLink.id cần đẩy lên Google Ads.
   *
   * Không truyền = đẩy TẤT CẢ link đang pending/error.
   *
   * IsUUID vì KeywordCampaignLink.id là `@default(uuid())`. Validate ở biên chứ
   * không tin phía gọi: các id này đi thẳng vào truy vấn Prisma rồi thành lệnh
   * mutate trên tài khoản quảng cáo thật.
   *
   * Chặn trần 500 phần tử: mỗi link là một lượt gọi Ads API, mà hàm serverless
   * chỉ có 300 giây. Lô lớn hơn thì gửi nhiều đợt, hoặc bỏ trống để lấy theo
   * pending/error.
   */
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  @IsOptional()
  linkIds?: string[];
}
