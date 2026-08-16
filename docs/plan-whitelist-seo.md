# Kế hoạch triển khai — Whitelist SEO từ từ khoá đã cắn tiền

> Repo: **Koi Backend** (NestJS + Prisma multiSchema + Vercel serverless)
> Repo phụ thuộc: **Heoiu** (panel báo cáo)
> Người chốt: chủ dự án. Trạng thái: mọi quyết định đã chốt — agent KHÔNG tự ý đổi.

## 1. Mục tiêu & phạm vi

Từ khoá Google Ads đang chạy **đã cắn tiền** (có click, có chi phí) là bằng chứng nhu cầu
thật của khách. Ta muốn AI review từng từ, chọn ra từ nào **đáng đưa vào whitelist SEO** để
sau này tạo content/title/meta nhắm đúng ý định tìm kiếm đó (kéo organic, bớt phụ thuộc Ads).

**Phase 1 (bản này):** snapshot metric hằng ngày + review bằng GPT + bảng whitelist + log
lịch sử + panel Heoiu hiển thị + nút chạy review tay + cron hằng ngày.

**Phase 2 (chỉ note, CHƯA làm):** nối whitelist xuống sinh content/title/meta SEO tự động.
Schema phase 1 phải KHÔNG chặn mở rộng đó (có sẵn `tuKhoa`, `trangThai`, `lyDo`, `diem`).

**Ngoài phạm vi:** KHÔNG phân hạng ưu tiên (bỏ `uuTien`), KHÔNG hạ expired tự động (bỏ
`expired`), KHÔNG ngưỡng chi phí, KHÔNG kéo ALL_TIME.

## 2. Quyết định đã chốt (bắt buộc tuân theo)

1. Ngưỡng vào diện review: `cuBam >= 1` (≥1 click trong cửa sổ dữ liệu), KHÔNG xét chi phí.
2. Snapshot metric HẰNG NGÀY từ hôm nay trở đi. Không kéo ALL_TIME.
3. AI = OpenAI GPT `gpt-4.1-mini`, tái dùng `src/ai-edit/openai.client.ts` (fetch +
   `response_format: json_object`), env `OPENAI_API_KEY` / `OPENAI_MODEL`.
4. Thiết kế whitelist ngay từ đầu để phase 2 nối sinh content (nhưng phase 1 CHƯA sinh).
5. KHÔNG cột `uuTien`, KHÔNG phân cao/trung-binh/thap (khỏi schema, prompt, UI).
6. Trạng thái chỉ đổi khi AI review lại quyết định. Bỏ `expired`. Chỉ có
   `whitelisted`/`rejected` (+ `pending` mặc định). Từ khoá đã có trạng thái vẫn được đưa vào
   diện review lại khi hết hạn lịch lại (`WHITELIST_REVIEW_LICH_LAI_NGAY`). Cơ chế: **upsert
   bảng trạng thái + append bảng log**; review lại ra kết quả khác cũ chỉ cần upsert đổi
   trạng thái + append log.

## 3. Khảo sát codebase (đã đối chiếu)

**Koi Backend:**
- `prisma/schema.prisma:3` `previewFeatures = ["multiSchema"]`; `:9` datasource schemas
  `["koi_free_style", "public"]`. Mọi model Koi đều `@@schema("koi_free_style")` + `@@map`
  snake_case, id `String @id @default(uuid())`.
- `KoiAdKeyword` (schema `:828-899`) — mẫu gần nhất về `tuKhoa`/`chienDich`/`trangThai`.
- `KoiContentRevision` (`:773-820`) — mẫu bảng log append (model, actor, batch, createdAt).
- `src/ai-edit/openai.client.ts:113` `sinhJson(heThong, nguoiDung, soToken, anh)`; model
  getter `:29-31` (`OPENAI_MODEL`, default `gpt-4.1-mini`); key `:33-35`; timeout `:53-57`
  (`OPENAI_TIMEOUT_MS`, kẹp 58s < maxDuration 60s của vercel.json); `response_format` `:165`;
  đã xử lý 400/401/429/AbortError/finish_reason=length/parse-lỗi.
- `src/ai-edit/ai-edit.service.ts:315-330` gọi `sinhJson` rồi validate `dulieu` là object;
  `:333-381` map field dung-sai (thiếu khoá thì bỏ qua từng field, không chặn cả lô).
- `src/auth/auth.guard.ts` — `GHI_CHO_PHEP` allowlist token ghi `:38-90`; cron allowlist
  `:155` (khớp chính xác `/analytics/ads/cron/sweep`); service-token đọc `/analytics` `:174-196`;
  GET admin mặc định `:218-236`.
- `src/ads/ads.controller.ts:707-764` — `cronSweep` + `kiemCronSecret` `:743` (đọc
  `CRON_SECRET`, nhận `x-cron-secret` hoặc `Authorization: Bearer`, timingSafeEqual sha256
  `:759`). Đây là khuôn mẫu copy cho 2 cron mới.
- `src/ads/ads.service.ts:1496-1636` `tuKhoaThat()` — NGUỒN SNAPSHOT. Trả
  `{ daNoi, thieuBien, ocid, dsTuKhoa[] }`; mỗi phần tử có `tuKhoa, chienDich, hienThi,
  cuBam, chiPhi (= cost_micros/1e6), ctr, cpcTrungBinh, cuChuyenDoi, ...` — khớp ĐÚNG từng
  cột của `KoiKeywordMetric`. GAQL `keyword_view ... LAST_30_DAYS` (`:1543-1573`).
- `src/ads/ads.service.ts:1654-1747` `searchTermsThat()` — nguồn thay thế (search term khách
  gõ), nhưng KHÔNG có `ctr`/`cpcTrungBinh` → KHÔNG dùng cho snapshot (schema cần 2 cột đó).
- `src/ads/ads.module.ts` providers có `AdsService, GoogleAdsClient...` (chưa export).
- `src/ai-edit/ai-edit.module.ts` providers có `OpenAiClient` (chưa export).
- `vercel.json:14-16` crons hiện có 1 dòng `{ path: "/analytics/ads/cron/sweep", schedule: "0 3 * * *" }`.

**Heoiu:**
- `lib/nguon.js:32-66` `goi()` (service token, trả `{ok,data,loi}`); `:142-143` `koiTuKhoaThat`;
  exports `:289-314`.
- `lib/ghi.js:44-104` `guiGhi()` (write token); `:204-208` `koiDayTuKhoaNhieu`; exports `:355-377`.
- `lib/hanhdong.js:90-272` `BANG` action map; `:57-60` `layUuid`; `:282-289` `chay`.
- `lib/panel.js:1-10` contract panel `{ ok, the, bang?, ghiChu?, loi? }`; `:105` `the()`;
  `:3850-3984` `panelKeywordPool` (mẫu panel đầy đủ: the/nut/bang/hanhDong); `:3986-4002`
  PANEL map; `:4004-4013` `layPanel`.
- `lib/page.js:1155+` `PANELS`; `:1125-1129` `NHOM` (tab `koileather`).
- `api/index.js:257` route `GET /api/panel/:ten`; `:277` `POST /api/ghi/:ten`.

## 4. Schema Prisma (3 model, schema `koi_free_style`)

Thêm cuối `prisma/schema.prisma` (sau `SyncJobLog`). Giữ ĐÚNG tên model đã chốt.

```prisma
/// Snapshot metric từ khoá Google Ads, ghi HẰNG NGÀY (mỗi ngày một dòng/từ khoá).
/// Dữ liệu lấy từ tuKhoaThat() = keyword_view LAST_30_DAYS (số 30 ngày cuốn chiếu).
model KoiKeywordMetric {
  id           String   @id @default(uuid())
  tuKhoa       String
  chienDich    String?
  /// Ngày snapshot, chuẩn hoá về 00:00 giờ VN (Asia/Ho_Chi_Minh).
  ngay         DateTime
  hienThi      Int
  cuBam        Int
  chiPhi       Float    /// VND, cost_micros / 1e6
  ctr          Float?
  cpcTrungBinh Float?
  cuChuyenDoi  Int?

  @@unique([tuKhoa, chienDich, ngay])
  @@index([ngay])
  @@index([tuKhoa])
  @@map("koi_keyword_metrics")
  @@schema("koi_free_style")
}

/// Trạng thái whitelist SEO hiện tại của một từ khoá (upsert theo tuKhoa).
/// pending | whitelisted | rejected. KHÔNG có uuTien, KHÔNG có expired.
model KoiKeywordWhitelist {
  id          String   @id @default(uuid())
  tuKhoa      String   @unique
  chienDich   String?
  trangThai   String   @default("pending")
  lyDo        String?
  diem        Int?     /// 0-100
  nguonReview String   @default("ai") /// ai | tay
  model       String?
  ngayReview  DateTime @default(now())

  @@index([trangThai])
  @@map("koi_keyword_whitelist")
  @@schema("koi_free_style")
}

/// Nhật ký mỗi lần review (append-only, không bao giờ sửa/xoá dòng cũ).
model KoiKeywordReviewLog {
  id          String   @id @default(uuid())
  tuKhoa      String
  quyetDinh   String   /// whitelisted | rejected
  lyDo        String?
  diem        Int?
  model       String?
  metricId    String?  /// id dòng KoiKeywordMetric dùng để review (tuỳ chọn)
  ngayReview  DateTime @default(now())

  @@index([tuKhoa, ngayReview])
  @@map("koi_keyword_review_logs")
  @@schema("koi_free_style")
}
```

**Lưu ý migrate:**
- Dùng `npx prisma db push` (additive, đúng nếp đã thấy ở schema `:127`) — 3 bảng mới, không
  đụng bảng cũ. Back Koi xác nhận lại tuỳ môi trường (có thư mục `prisma/migrations/`).
- `chienDich String?` nhưng **service phải ghi `''` thay vì `null`** khi thiếu chiến dịch
  (`tuKhoaThat` đã trả `""`), vì Postgres coi nhiều NULL là khác nhau → `@@unique` với null
  sẽ bị phá, sinh dòng trùng.
- `WHITELIST_REVIEW_LICH_LAI_NGAY` (mặc định 7) là khoảng tối thiểu giữa 2 lần review cùng
  một từ khoá. KHÔNG phải "hạ expired" — không có hạ tự động.

## 5. Endpoint Koi — nhóm `/analytics/seo/...`

**Module mới `src/seo-whitelist/`** (3 file): `seo-whitelist.module.ts`,
`seo-whitelist.controller.ts`, `seo-whitelist.service.ts`.

Wiring:
- `seo-whitelist.module.ts` import `PrismaModule`, `AdsModule`, `AiEditModule`.
- Sửa 2 dòng để export: `ads.module.ts` thêm `exports: [AdsService]`; `ai-edit.module.ts`
  thêm `exports: [OpenAiClient]` (OpenAiClient stateless, share instance an toàn).
- Controller `@Controller("analytics")` — tiền tố `/analytics` đã nằm trong
  koi-domain-router, không phải deploy repo router.

### 5.1 `GET /analytics/seo/whitelist?trangThai=`
Admin (guard mặc định chặn anon; Heoiu đọc bằng service token qua nhánh `/analytics`).
Trả mảng `KoiKeywordWhitelist`, mỗi dòng kèm `metricGanNhat` = snapshot mới nhất của
`tuKhoa` đó (`chiPhi`, `cuBam`, `hienThi`, `ngay`) — để panel hiện cột "Chi phí 30 ngày"
mà không phải gọi thêm. Lọc `trangThai` nếu có; sắp `ngayReview` DESC.

### 5.2 `GET /analytics/seo/metrics?days=`
Admin. Xem snapshot gần đây (debug). `days` kẹp 1..90 (mẫu `analytics.controller.ts:150`).
Tuỳ chọn — nếu cắt để gọn thì bỏ endpoint này, panel debug dùng whitelist là đủ.

### 5.3 `POST /analytics/seo/review`
Admin/ghi. Body `{ ids?: string[] }` — `ids` = danh sách `KoiKeywordWhitelist.id` muốn ép
review lại; rỗng/thiếu = tự chọn diện review. Trả `{ ok, daReview, danhSach }`.
- Thêm `@Throttle({ default: { limit: 10, ttl: 60_000 } })` (chống gọi lạm phát, mẫu
  `ads.controller.ts:104`).
- Service lọc id đúng khuôn UUID (bỏ id sai), cap ≤ 200.

### 5.4 `GET /analytics/seo/cron/snapshot` (cron daily)
Dòng đầu hàm gọi `kiemCronSecret(req)` (copy pattern `ads.controller.ts:743`). Kéo
`ads.tuKhoaThat()` → upsert từng dòng vào `KoiKeywordMetric` với `ngay` = 00:00 VN hôm nay.
Trả `{ ok, daGhi, loi? }`.

### 5.5 `GET /analytics/seo/cron/review` (cron daily, sau snapshot)
`kiemCronSecret(req)`. Tự chọn diện review → gọi GPT batch → upsert + append log (xem §6).

### 5.6 Thay đổi `auth.guard.ts` (BẮT BUỘC, nếu thiếu sẽ 401)
1. Thêm 2 dòng allowlist cron, ngay cạnh dòng sweep `auth.guard.ts:155`:
   ```ts
   if (chuanHoaDuong(path) === "/analytics/seo/cron/snapshot") return true;
   if (chuanHoaDuong(path) === "/analytics/seo/cron/review") return true;
   ```
2. Thêm 1 dòng vào `GHI_CHO_PHEP` (`auth.guard.ts:38-90`) cho nút "Chạy review ngay" của Heoiu:
   ```ts
   ["POST", /^\/analytics\/seo\/review$/],
   ```
   (Đường tĩnh, đặt TRƯỚC các luật dynamic — theo quy ước "static trước dynamic".)

### 5.7 Env mới (Vercel → project koi-leather-api)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `WHITELIST_REVIEW_LICH_LAI_NGAY` | `7` | Số ngày tối thiểu giữa 2 lần review 1 từ khoá |
| `WHITELIST_REVIEW_SO_NGAY` | `14` | Cửa sổ ngày metric dùng để chọn diện review |
| `WHITELIST_REVIEW_BATCH` | `50` | Số từ khoá mỗi lần gọi GPT (20–50) |

`OPENAI_API_KEY`, `OPENAI_MODEL`, `CRON_SECRET` đã có — tái dùng, không thêm.

## 6. Pipeline chi tiết

### 6.1 Snapshot (cron + có thể gọi tay để backfill)
1. `const kq = await ads.tuKhoaThat()`.
2. `!kq.daNoi` → trả `{ ok:false, loi:'chưa nối Google Ads', thieuBien:kq.thieuBien }` (không ném).
3. `ngay = homNayVN()` = `new Date()` chuẩn về `Asia/Ho_Chi_Minh`, đặt giờ 00:00.
4. Với mỗi phần tử `dsTuKhoa`:
   `prisma.koiKeywordMetric.upsert({ where: { tuKhoa_chienDich_ngay: { tuKhoa, chienDich: (chienDich||''), ngay } }, create:{...}, update:{ hienThi, cuBam, chiPhi, ctr, cpcTrungBinh, cuChuyenDoi } })`.
5. Trả `{ ok:true, daGhi: dsTuKhoa.length }`.

> Ghi chú semantic: `tuKhoaThat` trả cửa sổ 30 ngày cuốn chiếu, nên mỗi dòng snapshot là
> "số 30 ngày tính đến ngày đó". Vì vậy "cuBam>=1" đọc thành "có ≥1 click trong ~30 ngày
> gần nhất" — đúng nghĩa "đã cắn tiền gần đây". Đổi sang incremental theo ngày (query
> `segments.date=YESTERDAY`) thì chính xác "click trong ngày" nhưng tốn 1 GAQL mới + chịu
> lag 24-72h của Ads. **Chọn rolling để tái dùng hàm đã test** — đã cân nhắc, đừng đổi.

### 6.2 Review (tự chọn diện)
1. `moc = now - WHITELIST_REVIEW_SO_NGAY ngày` (VN).
2. Candidate = các `tuKhoa` DISTINCT trong `KoiKeywordMetric` có `cuBam >= 1` và `ngay >= moc`,
   xếp theo `SUM(chiPhi) DESC` (tốn tiền nhiều nhất review trước), cap theo batch × vài lô.
3. Load `KoiKeywordWhitelist` của các `tuKhoa` đó; **bỏ qua** từ có
   `ngayReview >= now - WHITELIST_REVIEW_LICH_LAI_NGAY ngày`.
4. Chia lô 20–50 (`WHITELIST_REVIEW_BATCH`), mỗi lô gọi `openai.sinhJson(system, user)`.
5. Parse từng `danhGia[i]`: thiếu `tuKhoa` / `quyetDinh` ngoài tập cho phép / `diem` không
   phải số → **bỏ qua từ đó** (khuôn `ai-edit.service.ts:333`), không chặn cả lô.
6. Map `quyetDinh`: `"whitelist"→"whitelisted"`, `"reject"→"rejected"` (cũng chấp nhận
   `"whitelisted"/"rejected"` nếu model trả dài).
7. `prisma.koiKeywordWhitelist.upsert({ where:{tuKhoa}, create, update:{ trangThai, lyDo,
   diem, nguonReview:"ai", model, ngayReview:now } })`.
8. `prisma.koiKeywordReviewLog.create(...)` LUÔN append mỗi từ đã review (kể cả kết quả
   giống lần trước — đúng quyết định §2.6).
9. Trả `{ ok, daReview: n, danhSach: [...] }`.

**Prompt system (tiếng Việt, đúng ngành đồ da thủ công):**
```
Bạn là chuyên gia SEO cho cửa hàng đồ da thủ công koileather.com (Koi Leather).
Cửa hàng bán đồ da handmade: ví da, bóp da, thắt lưng da, cặp/túi da, ốp lưng da và phụ
kiện da thật. Khách người Việt, chốt đơn qua Zalo (không bán online tự động).

Nhiệm vụ: với mỗi từ khoá quảng cáo Google đang chạy, đánh giá từ đó có ĐÁNG đưa vào
whitelist SEO hay không. "Whitelist" nghĩa là đáng để tạo nội dung SEO (bài viết, trang
đích, meta title/description) nhắm đúng ý định tìm kiếm đó, kéo lượt tự nhiên thay vì
phải trả tiền quảng cáo.

Tiêu chí: (1) liên quan tới đồ da thật shop bán được; (2) ý định thương mại (muốn MUA,
không chỉ tìm hiểu); (3) từ cụ thể, rõ, không quá chung chung/sai chính tả nặng;
(4) có bằng chứng nhu cầu từ số liệu quảng cáo kèm theo.

Trả về DUY NHẤT một JSON đúng khuôn:
{"danhGia":[{"tuKhoa":"...","quyetDinh":"whitelist"|"reject","lyDo":"một câu tiếng Việt ngắn gọn","diem":0-100}]}
- "quyetDinh" CHỈ nhận "whitelist" hoặc "reject".
- "diem" là số nguyên 0-100 (càng cao càng đáng đưa vào SEO).
- Đánh giá ĐÚNG số từ nhận được, giữ nguyên chữ gốc của tuKhoa, không thêm bớt.
```

**Prompt user (mỗi lô):**
```
Đánh giá từng từ khoá dưới đây để quyết định đưa vào whitelist SEO. Mỗi dòng: "từ khoá" |
chiến dịch | hiển thị | click | chi phí VND | chuyển đổi.
1. "ví da bò thật" | Chiến dịch A | 1200 | 34 | 1250000 | 2
2. "mua ví da nam" | Chiến dịch A | 800 | 12 | 480000 | 0
...
Trả về JSON đúng khuôn đã nêu trong hướng dẫn hệ thống.
```
(Service dựng danh sách từ snapshot mới nhất của từng `tuKhoa`.)

## 7. Heoiu

### `lib/nguon.js` (thêm 2 hàm + exports)
```js
const koiSeoWhitelist = (trangThai) =>
  goi(KOI + '/analytics/seo/whitelist' + (trangThai ? '?trangThai=' + encodeURIComponent(trangThai) : ''));
const koiSeoMetrics = (ngay = 7) =>
  goi(KOI + '/analytics/seo/metrics?days=' + ngay);
```
Không cần `CHO_LAU_MS` — 2 đường chỉ đọc DB của Koi.

### `lib/ghi.js` (thêm 1 hàm + export)
```js
const koiSeoReview = (ids) =>
  guiGhi(KOI + '/analytics/seo/review', {
    than: ids === undefined || ids === null ? {} : { ids },
    choMs: CHO_SYNC_MS,   // review gọi GPT batch + ghi, có thể chậm
  });
```

### `lib/hanhdong.js` (thêm action)
```js
'seo-review': (b) => {
  if (!Object.prototype.hasOwnProperty.call(b, 'ids') || b.ids === undefined || b.ids === null) {
    return ghi.koiSeoReview();
  }
  if (!Array.isArray(b.ids)) return { ok: false, loi: 'ids phai la mang' };
  if (b.ids.length === 0) return { ok: false, loi: 'ids rong — khong co gi de review' };
  const ds = [];
  for (const v of b.ids) {
    const id = layUuid(v);
    if (!id) return { ok: false, loi: 'ids chua id khong hop le (phai la UUID)' };
    ds.push(id);
  }
  return ghi.koiSeoReview(ds);
},
```

### `lib/panel.js` (hàm `panelSeoWhitelist` + đăng ký PANEL)
- Gọi `nguon.koiSeoWhitelist()`.
- Thẻ số đếm: `the('Đang whitelist', n, ...)`, `the('Reject', n, ...)`,
  `the('Chờ review', n, ...)` (đếm theo `trangThai`).
- Nút: `{ nhan: 'Chạy review ngay', hanhDong: 'seo-review', than: {}, hienKetQua: true, hoi: '...' }`.
- Bảng cột (đúng thứ tự đã chốt, KHÔNG cột ưu tiên):
  `[Từ khoá, Chiến dịch, Trạng thái, Điểm, Lý do, Ngày review, Chi phí 30 ngày]`.
  - `Chi phí 30 ngày` lấy từ `metricGanNhat.chiPhi` (đã kèm trong endpoint) — dùng `tienVN`.
  - `Trạng thái` dịch: pending→"Chờ review", whitelisted→"✓ Whitelist", rejected→"✕ Reject".
  - `Ngày review` format theo `MUI_GIO_VN` (giờ VN).
- Đăng ký: `'koi-seo-whitelist': panelSeoWhitelist` trong `PANEL` (`panel.js:3986`).

### `lib/page.js` (thêm PANELS)
```js
{
  ten: 'koi-seo-whitelist',
  nhom: 'koileather',
  tieuDe: 'Whitelist SEO',
  nhan: 'AI review từ khoá',
  mau: 'blue',
  logo: 'google',
  mo: 'Từ khoá Ads đã cắn tiền được AI review để chọn ra từ đáng làm SEO (organic).',
},
```
Đặt sau `koi-keyword-pool` (`page.js:1253`) trong nhóm `koileather`.

## 8. vercel.json (Koi)

```json
"crons": [
  { "path": "/analytics/ads/cron/sweep",     "schedule": "0 3 * * *" },
  { "path": "/analytics/seo/cron/snapshot",  "schedule": "0 3 * * *" },
  { "path": "/analytics/seo/cron/review",    "schedule": "0 4 * * *" }
]
```
- GIỮ nguyên cron sweep hiện có.
- Vercel cron chạy UTC: snapshot 3:00 UTC (10h VN), review 4:00 UTC (11h VN) — review chạy
  SAU snapshot, đọc đúng dữ liệu ngày hôm qua (VN) đã đầy đủ.

## 9. Rủi ro & lưu ý

- **Key AI chỉ tồn tại server-side** (`openai.client.ts:33`). Không endpoint nào trả key;
  không log. Review chạy trong Koi, Heoiu chỉ gửi lệnh qua token ghi.
- **Rate limit**: `@Throttle` trên POST review; cron tự nhiên thưa (1/ngày).
- **OpenAI timeout**: `hanChoMs` 50s < maxDuration 60s. Một lô 50 từ ~ vài giây, an toàn.
  Review quá nhiều lô trong 1 request cron có thể vượt 60s → cap số lô mỗi lượt (vd ≤ 5 lô
  = ≤250 từ/lượt), phần còn lại để lượt cron hôm sau xử tiếp (upsert + lịch lại 7 ngày đảm
  bảo không bỏ sót).
- **Múi giờ**: mọi mốc `ngay`/`ngayReview` theo `Asia/Ho_Chi_Minh` (mẫu `panel.js:22`),
  không GROUP BY UTC (lệch 7h đẩy lượt tối sang ngày sau).
- **Bảng metric lớn dần**: đã index `[ngay]` + `[tuKhoa]` + unique. Phase 2 cân nhắc job dọn
  giữ N ngày (ví dụ 90 ngày) — CHƯA làm.
- **`chienDich` null**: ghi `''` (xem §4) để unique không bị phá.
- **Heoiu timeout nút "Chạy review ngay"**: `guiGhi` 60s; nếu Koi review lâu hơn, Heoiu báo
  "không trả lời" nhưng Koi vẫn chạy xong — chấp nhận, note trong `hoi` của nút.

## 10. Phân công & thứ tự (đánh số)

1. **Back Koi** — migration + module:
   - `prisma/schema.prisma` thêm 3 model → `npx prisma db push`.
   - Tạo `src/seo-whitelist/` (module/controller/service) + sửa export 2 module.
   - `auth.guard.ts` thêm 2 dòng cron + 1 dòng GHI_CHO_PHEP.
   - `vercel.json` thêm 2 cron.
   - Env lên Vercel: `WHITELIST_REVIEW_LICH_LAI_NGAY`, `WHITELIST_REVIEW_SO_NGAY`,
     `WHITELIST_REVIEW_BATCH`.
   - *Xong khi*: `GET /analytics/seo/whitelist` trả `[]` hợp lệ; 2 cron trả 401 khi thiếu
     `CRON_SECRET`, 200 khi đúng.

2. **Back Heoiu** — `nguon.js` + `ghi.js` + `hanhdong.js` (thêm hàm/action như §7).
   - *Xong khi*: `POST /api/ghi/seo-review` đi đúng đường, không 401 token.

3. **Front Heoiu** — `panel.js` + `page.js` (panel `koi-seo-whitelist` + PANELS).
   - *Xong khi*: panel hiện bảng "Whitelist SEO" + 3 thẻ đếm + nút chạy review.

4. **Viet (reviewer)** — rà: key không lộ; prompt không nhắc `uuTien`/`expired`; allowlist
   auth đúng; upsert+log đúng quyết định §2.6.

5. **VK (test)** — (a) chạy cron snapshot+review 2 lần liên tiếp → log không trùng, không
   đẻ dòng whitelist trùng; (b) id UUID sai → bị chặn 400/401; (c) review lại đổi trạng
   thái đúng + append log mới; (d) thiếu CRON_SECRET → 401.

6. **Commit + deploy** — commit style `feat(panel): ...` (tiếng Việt, đúng nếp repo);
   Koi `npx vercel --prod`; Heoiu `node scripts/stamp-deploy.js` rồi `npx vercel --prod`.