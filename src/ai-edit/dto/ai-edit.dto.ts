import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { LoaiNoiDung } from "../ai-edit.types";

/**
 * ValidationPipe toàn cục bật whitelist + forbidNonWhitelisted (main.ts), nên
 * MỌI trường phải khai ở đây — thiếu một trường là cả request bị trả 400 chứ
 * không phải trường đó bị bỏ qua. Đây là lý do các DTO dưới khai đủ cả những
 * trường trông như thừa.
 */

const CAC_LOAI: LoaiNoiDung[] = [
  "post",
  "page",
  "product",
  "category",
  "product_tag",
  "blog_term",
];

export class TraLinkDto {
  /** 2048: giới hạn URL thực tế của các trình duyệt. */
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  link!: string;
}

export class SinhDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  link!: string;

  /**
   * Yêu cầu của chủ shop. 4000 ký tự là thoải mái cho một lời dặn dài, mà vẫn
   * chặn được ai đó dán cả một quyển sách vào rồi đốt token.
   */
  @IsString()
  @MinLength(3)
  @MaxLength(4000)
  yeuCau!: string;

  /** Không gửi = sửa mọi trường đang có chữ. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  truongChon?: string[];
}

export class MotThayDoiDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  truong!: string;

  /**
   * Chữ chủ shop đã thấy ở bước xem trước. Bắt buộc gửi lên: service so nó với
   * chữ đang nằm trong DB để phát hiện có người khác vừa sửa. Cho phép chuỗi
   * rỗng và null vì trường trong DB có thể đang trống.
   *
   * 400_000 ký tự: thân bài dài nhất trên site nằm dưới mức này rất xa, nhưng
   * phải cho đủ rộng để một bài thật không bị chặn oan.
   */
  @IsOptional()
  @IsString()
  @MaxLength(400_000)
  truoc?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(400_000)
  sau?: string | null;
}

export class ApDungDto {
  @IsIn(CAC_LOAI)
  kind!: LoaiNoiDung;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  path?: string | null;

  /** Lưu vào lịch sử để về sau còn biết lần sửa đó xuất phát từ yêu cầu gì. */
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  prompt?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => MotThayDoiDto)
  thayDoi!: MotThayDoiDto[];
}

export class HoanTacDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  batch!: string;

  /**
   * true = trả về bản gốc dù sau đó đã có người sửa tay. Mặc định false để
   * không lặng lẽ xoá công sửa tay của người khác.
   */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  buoc?: boolean;
}

export class LichSuDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  gioiHan?: number;
}
