import { IsString, IsOptional, Length, MaxLength, Matches } from "class-validator";

export class CreateLeadDto {
  @IsString()
  @Length(2, 80, { message: "Tên phải từ 2 đến 80 ký tự" })
  name: string;

  @IsString()
  @Matches(/^(0\d{9}|\+84\d{9})$/, { message: "Số điện thoại không hợp lệ" })
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: "Tin nhắn không được quá 2000 ký tự" })
  message?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "Tên sản phẩm không được quá 200 ký tự" })
  productName?: string;
}
