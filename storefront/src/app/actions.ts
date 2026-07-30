'use server';

export type LeadState = { ok: boolean; message: string } | null;

const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

/**
 * Nhận thông tin khách để lại → gửi tới API công khai POST /shop/leads của
 * KoiBack (ghi vào bảng leads). Không còn đọc/ghi Supabase trực tiếp.
 */
export async function submitLead(_prev: LeadState, formData: FormData): Promise<LeadState> {
  // Bẫy spam: ô ẩn, người thật không bao giờ điền, bot thì điền hết
  if (formData.get('website')) return { ok: true, message: 'Đã gửi. Cảm ơn bạn!' };

  const name = String(formData.get('name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const message = String(formData.get('message') ?? '').trim();
  const productName = String(formData.get('product_name') ?? '').trim();

  if (name.length < 2) return { ok: false, message: 'Vui lòng nhập tên của bạn.' };

  // Số Việt Nam: 10 số bắt đầu bằng 0, hoặc dạng +84
  const digits = phone.replace(/[\s.-]/g, '');
  if (!/^(0\d{9}|\+84\d{9})$/.test(digits)) {
    return { ok: false, message: 'Số điện thoại chưa đúng. Ví dụ: 0912345678' };
  }

  try {
    const res = await fetch(`${API}/shop/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        phone: digits,
        message: message || null,
        productName: productName || null,
      }),
    });
    if (!res.ok) throw new Error(String(res.status));
  } catch {
    return { ok: false, message: 'Gửi không thành công. Bạn thử lại hoặc nhắn Zalo giúp mình nhé.' };
  }

  return { ok: true, message: 'Đã nhận thông tin. Shop sẽ liên hệ lại trong thời gian sớm nhất.' };
}
