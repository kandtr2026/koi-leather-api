/**
 * Tem đánh dấu bản deploy — góc dưới bên phải.
 *
 * Mục đích: nhìn vào là biết bản đang xem có phải bản vừa sửa không,
 * khỏi phải đoán xem trình duyệt có đang giữ bản cũ trong bộ nhớ đệm.
 *
 * Giờ và mã commit được chốt LÚC BUILD (xem next.config.ts), không phải
 * lúc xem trang — nếu lấy lúc xem thì nó chỉ hiện đồng hồ, vô dụng.
 *
 * TẮT ĐI khi gắn tên miền thật: đặt NEXT_PUBLIC_SHOW_DEPLOY_BADGE=false.
 * Tem kỹ thuật trên trang bán đồ da cao cấp trông rất nghiệp dư.
 */
export function DeployBadge() {
  if (process.env.NEXT_PUBLIC_SHOW_DEPLOY_BADGE === 'false') return null;

  const iso = process.env.NEXT_PUBLIC_BUILD_TIME;
  const sha = process.env.NEXT_PUBLIC_COMMIT_SHA ?? 'local';
  if (!iso) return null;

  // Chốt múi giờ Việt Nam và định dạng ở phía máy chủ. Nếu để trình duyệt
  // tự định dạng theo máy khách thì chữ trên máy chủ và trên trình duyệt
  // khác nhau, React sẽ báo lỗi hydration.
  const when = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));

  return (
    <div
      // bottom-20 trên điện thoại để không đè lên thanh liên hệ dính đáy
      className="pointer-events-none fixed right-3 bottom-20 z-50 select-none md:bottom-3"
      aria-hidden="true"
    >
      <span className="rounded-full border border-koi-line/70 bg-white/80 px-2.5 py-1 font-mono text-[10px] tracking-tight text-koi-gray-light shadow-sm backdrop-blur-sm">
        {sha} · {when}
      </span>
    </div>
  );
}
