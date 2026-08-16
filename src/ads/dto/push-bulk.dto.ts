import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from "class-validator";

/**
 * Body cho nút "Đẩy cả lô" từ sổ tay từ khoá lên Google Ads (batch push).
 *
 * Chỉ nhận ĐÚNG một field `ids` — mọi field lạ đều bị ValidationPipe whitelist
 * cắt bỏ trước khi tới service, nên không có kênh nào chui thêm tham số vào một
 * đường MUTATE tài khoản quảng cáo thật.
 */
export class PushBulkDto {
  /**
   * Danh sách KoiAdKeyword.id cần đẩy lên Google Ads.
   *
   * IsUUID vì KoiAdKeyword.id là `@default(uuid())`. Validate ở biên chứ không
   * tin phía gọi: các id này đi thẳng vào truy vấn Prisma rồi thành lệnh mutate
   * trên tài khoản đang tiêu tiền thật.
   *
   * ArrayMinSize(1): mảng rỗng → 400 ngay, không gọi Google Ads lần nào.
   * ArrayMaxSize(500): cùng trần với SyncPushDto — mỗi id là một lượt gọi Ads
   * API (cộng thêm throttle giữa các lượt), hàm serverless chỉ có 300 giây.
   * Lô lớn hơn thì gửi nhiều đợt.
   */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @IsUUID("4", { each: true })
  ids: string[];
}
