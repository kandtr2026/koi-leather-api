import { IsString, IsOptional, Length, MaxLength, Matches } from "class-validator";

export class CreateLeadDto {
  @IsString()
  @Length(2, 80, { message: "Tên phải từ 2 đến 80 ký tự" })
  name: string;

  // Số VN 10 chữ số (di động) hoặc 11 (máy bàn 02x), hoặc số quốc tế E.164 có
  // "+". Trước 27/09/2026 chỉ nhận 0xxxxxxxxx / +84…: storefront (trang tiếng
  // Anh) cho khách nước ngoài gõ +1…, +44… rồi gửi lên đây và bị trả 400 —
  // khách chỉ thấy "gửi lỗi", bảng leads chưa từng có một số quốc tế nào. Luật
  // phải khớp soDienThoaiHopLe() ở koi-storefront/src/app/(vi)/actions.ts.
  @IsString()
  @Matches(/^(0\d{9,10}|\+[1-9]\d{7,14})$/, { message: "Số điện thoại không hợp lệ" })
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
