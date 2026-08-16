import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";

/**
 * DTO cho ba đường POST của cụm "Ads ↔ Landing ↔ SEO"
 * (analyze / score / seo-draft trong ads.controller.ts).
 *
 * Cả ba đường đều gọi GPT (tốn phí OpenAI) và/hoặc fetch ra ngoài, nên validate
 * ở biên cho chặt: ValidationPipe whitelist cắt mọi field lạ, trần độ dài chặn
 * prompt phình to đốt token. Khuôn nhận vào khớp đúng hop dong API — thêm field
 * là phải sửa cả service lẫn frontend heoiu.
 */

/**
 * Bước 2 — phân tích một trang landing.
 *
 * IsUrl chặn chuỗi không phải URL ngay ở biên (400). Host allowlist kiểm THÊM
 * trong service (chi nhan koileather.com / kitleather.com): IsUrl không biết
 * host nào được phép fetch, và đây là chốt chống SSRF nên không phó hết cho
 * một decorator.
 */
export class AnalyzeDto {
  @IsUrl(
    { require_protocol: true, protocols: ["http", "https"] },
    { message: "url phải là địa chỉ http/https hợp lệ" },
  )
  @MaxLength(2048)
  url: string;
}

/**
 * Một search term thật khách gõ (chưa là từ khoá) kèm số liệu, để AI ưu tiên
 * đề xuất vào nhóm nenThem. Khuôn này heoiu lấy từ /ads/search-terms/live rồi
 * lọc/lắp sang — giữ đúng ba field, thừa bị whitelist cắt.
 */
export class SearchTermDto {
  @IsString()
  @MaxLength(300)
  term: string;

  /** Số cú bấm 30 ngày. Vắng thì coi như 0. */
  @IsOptional()
  @IsNumber()
  @Min(0)
  cuBam?: number;

  /** Số chuyển đổi 30 ngày (Google có thể trả số lẻ nên nhận number, không ép int). */
  @IsOptional()
  @IsNumber()
  @Min(0)
  cuChuyenDoi?: number;
}

/**
 * Bước 3 — chấm MỘT LÔ từ khoá so với nội dung landing.
 *
 * tuKhoas trần 120: client tự chia lô gọi nhiều lần chứ server không gộp, vì
 * mỗi lượt GPT đã có hạn chờ 50 giây trong khi hàm serverless chỉ sống 60 giây.
 * landingText trần 12000 nhỉnh hơn mức cat 8000 của bước analyze một khoảng
 * phòng xa, service sẽ tự cat lại đúng mức trước khi đưa vào prompt.
 */
export class ScoreDto {
  /** Text đã lột của trang landing (textTrich từ bước analyze). */
  @IsString()
  @MaxLength(12_000)
  landingText: string;

  /** Tóm tắt trang bán gì (bước analyze) — tuỳ chọn, thiếu thì AI tự đọc text. */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tomTat?: string;

  /** Ý định tìm kiếm phù hợp (bước analyze) — tuỳ chọn. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  intent?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  tuKhoas: string[];

  /**
   * Search term thật có click/chuyển đổi chưa là từ khoá. Không bắt buộc:
   * campaign mới chạy chưa có dữ liệu thì vẫn chấm được nenDung/nenChan, chỉ
   * là nenThem mất nguồn "search_term" và còn AI đề xuất.
   */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SearchTermDto)
  searchTerms?: SearchTermDto[];
}

/**
 * Bước 6 — viết đề xuất khối nội dung bổ sung cho landing (H2/FAQ).
 *
 * tuKhoas là các từ khóa xịn (nenDung + nenThem đã duyệt), trần 200 — rộng hơn
 * lô chấm vì lúc này là danh sách đã lọc qua review của chủ shop.
 */
export class SeodraftDto {
  @IsString()
  @MaxLength(12_000)
  landingText: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  tomTat?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  tuKhoas: string[];

  /** URL landing — chỉ để AI biết đang viết cho trang nào, không fetch lại. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  url?: string;
}

/**
 * Verified pool — quyết định duyệt của MỘT từ khoá trên một landing.
 *
 * Phase 1 chỉ nhận đúng 'pushed' (đã đẩy lên Google Ads): chủ shop đã chốt chỉ
 * lưu từ đã đẩy, từ bị loại KHÔNG vào pool. IsIn chặn mọi giá trị lạ ngay ở
 * biên; service vẫn kiểm lại vì không tin client.
 */
export class QuyetDinhVerifiedDto {
  /** Từ khoá nguyên văn heoiu gửi — service chuẩn hoá lại trim + lowercase. */
  @IsString()
  @MaxLength(200)
  tuKhoa: string;

  @IsIn(["pushed"], { message: "quyetDinh hiện chỉ nhận 'pushed'" })
  quyetDinh: string;

  /** Id chiến dịch lúc đẩy — tham khảo, thiếu cũng được. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  chienDich?: string;
}

/**
 * Verified pool — lưu cả lô quyết định cho MỘT landing.
 *
 * url validate giống hệt AnalyzeDto (IsUrl + trần 2048); host allowlist kiểm
 * THÊM trong service vì IsUrl không biết host nào được phép — cùng chốt chống
 * gieo rác pool bằng URL ngoài danh sách. Trần 200 quyết định: heoiu gửi cả
 * wizard một lần; 200 từ × 200 ký tự vẫn nằm gọn dưới trần body 64KB của heoiu.
 */
export class LuuVerifiedDto {
  @IsUrl(
    { require_protocol: true, protocols: ["http", "https"] },
    { message: "url phải là địa chỉ http/https hợp lệ" },
  )
  @MaxLength(2048)
  url: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => QuyetDinhVerifiedDto)
  dsQuyetDinh: QuyetDinhVerifiedDto[];
}
