/**
 * Viết mô tả sản phẩm HÀNG LOẠT bằng chính module ai-edit của backend.
 *
 * Chạy:
 *   node scripts/viet-mo-ta-hang-loat.mjs --liet-ke              # chỉ xem lô, KHÔNG gọi AI
 *   node scripts/viet-mo-ta-hang-loat.mjs --thu --gioi-han=2     # gọi AI, in chữ, KHÔNG ghi DB
 *   node scripts/viet-mo-ta-hang-loat.mjs --ghi --gioi-han=5     # ghi thật vào DB
 *   node scripts/viet-mo-ta-hang-loat.mjs --giup                 # đủ danh sách cờ
 *
 * MẶC ĐỊNH LÀ KHÔNG GHI. Không có cờ --ghi thì script chạy như --thu: gọi AI, in
 * chữ ra, không sửa một dòng nào trong cơ sở dữ liệu.
 *
 * VÌ SAO NẠP MODULE .ts BẰNG ts-node CHỨ KHÔNG GỌI HTTP, CŨNG KHÔNG DÙNG dist/:
 *
 *  · Không gọi HTTP: mọi đường /analytics/ai-edit/* đòi Bearer admin, mà lấy được
 *    token thì vẫn phải đi qua koi-domain-router (hạn 300 giây) và hàm serverless
 *    trên Vercel. Chạy 162 sản phẩm qua đường đó là 162 lần khởi động lạnh, 162
 *    lần mở lại kết nối pgbouncer, và mỗi lượt gọi AI ~30-60 giây nằm sát hạn của
 *    tầng ngoài. Trong tiến trình thì không có tầng nào cắt ngang.
 *
 *  · Không dùng dist/: dist là kết quả của `nest build`, ngày nào nó cũ hơn src là
 *    script chạy CODE KHÁC với code đang đọc — kiểu sai không ai lần ra. ts-node
 *    nạp thẳng .ts nên luôn đúng bản đang có trên đĩa, và không cần build.
 *
 *  · transpileOnly: kiểm kiểu là việc của `npx tsc --noEmit`, không phải của lúc
 *    chạy. Repo đang có lỗi kiểu sẵn ở src/product/components/*.tsx (bị loại khỏi
 *    tsconfig.build.json nên không ảnh hưởng bản deploy); bật kiểm kiểu ở đây là
 *    script chết vì một tệp React không liên quan.
 *
 * TÁI DÙNG NGUYÊN LUỒNG CỦA ADMIN, KHÔNG VIẾT LẠI:
 *   AiEditService.sinh(path, yeuCau, ["description"])  → resolve + prompt + gọi AI
 *   AiEditService.apDung({...})                        → ghi + chụp KoiContentRevision
 * Nhờ vậy mọi lớp bảo vệ vẫn còn nguyên và KHÔNG phải nhắc lại ở đây: allowlist
 * trường (slug không bao giờ sửa được), bọc lại vỏ JSON {"vi":"..."} bằng
 * bocLai() trong ai-edit.json-vi.ts, chặn ghi đè khi dữ liệu đã đổi, và ghi bản
 * gốc vào KoiContentRevision theo batch để hoàn tác được.
 *
 * KHÔNG chạm searchText (cột Postgres tự tính) vì AiEditWriter chỉ ghi những cột
 * trong TRUONG_CHO_PHEP — searchText không có trong đó.
 *
 * KEY OPENAI: đọc từ môi trường shell hoặc .env (không ghi vào tệp nào, không in
 * ra). Máy này đang có sẵn trong môi trường shell.
 */
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ---------------------------------------------------------------- 1. Cờ ---- */

/**
 * Danh sách cờ hợp lệ. Cờ lạ thì NÉM LỖI chứ không bỏ qua: gõ sai `--gi` thành
 * `--ghi` thì im lặng bỏ qua là chạy 162 sản phẩm ở chế độ thử mà cứ tưởng đã
 * ghi — hoặc ngược lại.
 */
const CO_HOP_LE = new Set([
  "giup",
  "help",
  "thu",
  "ghi",
  "liet-ke",
  "slug",
  "gioi-han",
  "tu-dau",
  "dong-thoi",
  "nghi",
  "truong",
  "yeu-cau",
  "yeu-cau-tep",
  "tep-log",
  "actor",
  "hoan-tac",
  "dot",
  "buoc",
  "ghi-ca-khi-canh-bao",
]);

function docCo(argv) {
  const co = new Map();
  for (const arg of argv) {
    if (!arg.startsWith("--")) {
      throw new Error(`Tham số lạ "${arg}". Xem --giup.`);
    }
    const [ten, ...phan] = arg.slice(2).split("=");
    if (!CO_HOP_LE.has(ten)) throw new Error(`Cờ lạ "--${ten}". Xem --giup.`);
    co.set(ten, phan.length ? phan.join("=") : true);
  }
  return co;
}

// Đọc cờ NGOÀI main() nên phải tự bắt lỗi ở đây: để nó nổi lên thành exception
// của module thì Node in cả vết gọi, mà lỗi gõ sai cờ chỉ cần một dòng.
let co;
try {
  co = docCo(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

/** Lỗi cấu hình: in một dòng rồi thoát. Không ai cần vết gọi cho lỗi gõ cờ. */
function dung(thong) {
  console.error(thong);
  process.exit(1);
}

function soNguyen(ten, macDinh, nhoNhat, lonNhat) {
  const tho = co.get(ten);
  if (tho == null || tho === true) return macDinh;
  const n = Number(tho);
  if (!Number.isFinite(n)) dung(`--${ten} phải là số.`);
  return Math.min(Math.max(Math.floor(n), nhoNhat), lonNhat);
}

const GIUP = `
Viết mô tả sản phẩm hàng loạt bằng module ai-edit (koileather.com).

  --liet-ke          Chỉ in danh sách lô sẽ chạy. KHÔNG gọi AI, KHÔNG tốn tiền.
  --thu              Gọi AI, in chữ sinh ra, KHÔNG ghi DB. (Đây là mặc định.)
  --ghi              GHI THẬT vào DB. Có chụp bản gốc nên hoàn tác được.
  --slug=a,b,c       Chỉ chạy đúng vài sản phẩm theo slug.
  --gioi-han=N       Giới hạn số sản phẩm trong lô.
  --tu-dau           Bỏ qua sản phẩm đã có mô tả và sản phẩm đã ghi xong ở lần
                     chạy trước (đọc trong tệp log). Chạy lại không ghi đè.
  --dong-thoi=N      Số sản phẩm chạy song song, 1-3. Mặc định 1.
  --nghi=MS          Khoảng nghỉ tối thiểu giữa hai lượt gọi AI. Mặc định 1500.
  --truong=a,b       Trường cần AI viết. Mặc định "description".
  --yeu-cau="..."    Thay lời dặn mặc định.
  --yeu-cau-tep=T    Đọc lời dặn từ tệp T.
  --tep-log=T        Tệp nhật ký JSONL. Mặc định scripts/_log-viet-mo-ta.jsonl.
  --actor=EMAIL      Ghi vào cột actor của KoiContentRevision.
  --hoan-tac=X       Hoàn tác. X = mã batch, hoặc tệp log (đi kèm --dot).
  --dot=UUID         Mã đợt chạy, để hoàn tác đúng một đợt trong tệp log.
  --buoc             Hoàn tác cưỡng chế, kể cả khi đã có người sửa tay sau đó.
  --ghi-ca-khi-canh-bao
                     Vẫn ghi món có cảnh báo nội dung. Mặc định là BỎ QUA để
                     người thật đọc trước (thẻ HTML hở, số đo, logo lạ…).

Lô mặc định: koi_products có isDeleted=false AND description='{}' (mô tả rỗng
thật). Sản phẩm description=NULL hay chuỗi rỗng KHÔNG nằm trong lô này.
`.trim();

if (co.has("giup") || co.has("help")) {
  console.log(GIUP);
  process.exit(0);
}

const CHE_DO_GHI = co.has("ghi");
const CHI_LIET_KE = co.has("liet-ke");
const DONG_THOI = soNguyen("dong-thoi", 1, 1, 3);
const NGHI_MS = soNguyen("nghi", 1500, 0, 600_000);
const GIOI_HAN = soNguyen("gioi-han", 0, 0, 10_000);
const TEP_LOG = path.resolve(
  GOC,
  co.get("tep-log") === undefined || co.get("tep-log") === true
    ? "scripts/_log-viet-mo-ta.jsonl"
    : String(co.get("tep-log")),
);
const ACTOR =
  co.get("actor") && co.get("actor") !== true
    ? String(co.get("actor"))
    : "script:viet-mo-ta-hang-loat.mjs";
const DOT = randomUUID();

const TRUONG =
  co.get("truong") && co.get("truong") !== true
    ? String(co.get("truong"))
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : ["description"];

const SLUG_CHON =
  co.get("slug") && co.get("slug") !== true
    ? String(co.get("slug"))
        .split(",")
        .map((s) => s.trim().replace(/^\/+|\/+$/g, ""))
        .filter(Boolean)
    : null;

/* ------------------------------------------------------------- 2. .env ---- */

// Nạp .env bằng tay, giống scripts/compute-display-rank.js: script chạy bằng
// `node` trần nên không có ConfigModule, mà thêm dotenv chỉ cho một script thì
// thừa. KHÔNG ghi đè biến đã có trong môi trường shell — máy đang chạy có sẵn
// OPENAI_API_KEY ở đó, và biến của shell phải thắng tệp.
const duongEnv = path.join(GOC, ".env");
if (fs.existsSync(duongEnv)) {
  for (const dong of fs.readFileSync(duongEnv, "utf8").split(/\r?\n/)) {
    const m = dong.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

if (!process.env.DATABASE_URL) {
  dung("Thiếu DATABASE_URL (môi trường shell hoặc .env).");
}
// Kiểm key MỘT LẦN ở đây thay vì để lượt gọi đầu tiên chết: chạy 162 sản phẩm rồi
// nhận 162 lỗi giống nhau là vô ích. --liet-ke không gọi AI nên không cần key.
if (!CHI_LIET_KE && !co.has("hoan-tac") && !process.env.OPENAI_API_KEY) {
  dung(
    "Thiếu OPENAI_API_KEY. Đặt vào môi trường shell hoặc .env trước khi chạy.\n" +
      "Bản trên Vercel nằm ở project koi-leather-api → Settings → Environment\n" +
      "Variables; bản đã kéo về máy nằm trong tệp .env.pull-tam (đừng commit).",
  );
}

/* ------------------------------------------------- 3. Nạp module NestJS ---- */

const req = createRequire(path.join(GOC, "package.json"));
req("reflect-metadata");
req("ts-node").register({
  project: path.join(GOC, "tsconfig.json"),
  transpileOnly: true,
  compilerOptions: { module: "commonjs" },
});

const { NestFactory } = req("@nestjs/core");
const { AiEditModule } = req(path.join(GOC, "src/ai-edit/ai-edit.module.ts"));
const { AiEditService } = req(path.join(GOC, "src/ai-edit/ai-edit.service.ts"));
const { PrismaService } = req(path.join(GOC, "src/prisma/prisma.service.ts"));
// goBoc: dùng đúng helper của module để đọc cột JSON i18n {"vi":"..."}, không tự
// parse lại. Ép String() một giá trị đã qua middleware Prisma ra "[object
// Object]" — lỗi này đã lên tới production một lần, xem ai-edit.json-vi.ts.
const { goBoc } = req(path.join(GOC, "src/ai-edit/ai-edit.json-vi.ts"));

/* --------------------------------------------------------- 4. Lời dặn ------ */

/**
 * Lời dặn mặc định cho 162 sản phẩm đang có description rỗng.
 *
 * Viết cho tình huống MÔ TẢ TRỐNG HOÀN TOÀN, khác với việc "biên tập lại" mà
 * admin thường dùng: phải nói rõ là viết mới, kèm khuôn bài, nếu không model trả
 * lại đúng chuỗi rỗng vì lời dặn hệ thống bảo "trường nào đã ổn thì trả nguyên
 * văn bản gốc" (ai-edit.service.ts, hàm loiDan).
 *
 * Phần cấm nhắc lại có chủ ý dù lời dặn hệ thống đã cấm: bảo hành và đổi trả là
 * chỗ site này đã sai một lần (bảo hành 12 tháng in ở khuôn trang, 44 bài blog
 * còn ghi 24 tháng), nên không để model tự do nói về chúng trong mô tả sản phẩm.
 *
 * HAI DÒNG DƯỚI ĐÂY THÊM SAU LẦN CHẠY THỬ ĐẦU TIÊN, vì chúng bắt lỗi thật:
 *  · "đóng đủ thẻ": lượt thử đầu, một trong hai món trả về 3 thẻ <p> mà chỉ 2 thẻ
 *    </p>. HTML hở đi thẳng vào dangerouslySetInnerHTML của storefront.
 *  · "không đọc chữ trong ảnh": món kia có logo khách đặt hàng dập trên da, và
 *    model viết nguyên tên thương hiệu đó vào mô tả của KOI Leather. Nhiều món
 *    trong lô là hàng đặt riêng cho doanh nghiệp, nên đây không phải ca lẻ.
 */
const YEU_CAU_MAC_DINH = `
Sản phẩm này ĐANG KHÔNG CÓ mô tả — hãy viết MỚI HOÀN TOÀN trường description.

Khuôn bài:
- Trả về HTML. 2-3 thẻ <p>, mỗi thẻ 2-4 câu. Được thêm một <ul> với 3-5 <li>
  ngắn cho phần điểm đáng chú ý, nếu thấy tự nhiên.
- ĐÓNG ĐỦ MỌI THẺ. Mỗi <p> phải có </p>, mỗi <li> phải có </li>. Không để hở
  thẻ nào ở câu cuối.
- Câu đầu nói ngay đây là món gì và làm bằng loại da nào (theo khối SỰ THẬT).
  Không mở bài vòng vo, không câu dẫn kiểu quảng cáo.
- Phần giữa: tả những gì NHÌN THẤY RÕ trong ảnh — kiểu dáng, bố cục ngăn và
  quai, đường chỉ, khoá và phụ kiện, vân da, sắc màu. Nếu khối SỰ THẬT có ghi
  đặc tính của loại da thì dùng đúng phần đó.
- Câu kết: dịp dùng hoặc kiểu người dùng phù hợp. Viết mộc, không hô hào.
- Khoảng 120-200 từ. Giọng như người thợ nói về món mình làm.

KHÔNG ĐỌC CHỮ TRONG ẢNH RA BÀI. Nhiều món là hàng đặt riêng cho doanh nghiệp
nên trên da có logo, tên hoặc chữ của khách đặt. Tuyệt đối không nhắc tên riêng,
tên thương hiệu hay chữ nào nhìn thấy trên sản phẩm — dù thấy rất rõ. Muốn nói
về chi tiết đó thì viết trung tính: "chi tiết dập nổi", "khắc theo yêu cầu".

TUYỆT ĐỐI KHÔNG viết: số đo, dung tích, trọng lượng, số ngăn nếu không đếm rõ
được trong ảnh, giá, thời gian bảo hành, chính sách đổi trả, thời gian giao
hàng, xuất xứ da, cách gia công không chắc (cắt laser, dập máy, khâu máy).
Không có trong dữ liệu thì không được nghĩ ra.
Không dùng các cụm "trong ảnh", "như hình", "có thể thấy". Không nhồi từ khoá,
không lặp tên sản phẩm quá hai lần.
`.trim();

function layYeuCau() {
  const tep = co.get("yeu-cau-tep");
  if (tep && tep !== true) {
    const duong = path.resolve(GOC, String(tep));
    if (!fs.existsSync(duong)) dung(`Không có tệp lời dặn: ${duong}`);
    return fs.readFileSync(duong, "utf8").trim();
  }
  const chu = co.get("yeu-cau");
  if (chu && chu !== true) return String(chu).trim();
  return YEU_CAU_MAC_DINH;
}

const YEU_CAU = layYeuCau();
if (!YEU_CAU) dung("Lời dặn rỗng — AiEditService.sinh() sẽ từ chối.");

/* ----------------------------------------------------------- 5. Nhật ký ---- */

/** Đọc lại tệp log để chạy tiếp được. Dòng hỏng thì bỏ, không làm chết cả lượt. */
function docLog() {
  if (!fs.existsSync(TEP_LOG)) return [];
  return fs
    .readFileSync(TEP_LOG, "utf8")
    .split(/\r?\n/)
    .filter((d) => d.trim())
    .map((d) => {
      try {
        return JSON.parse(d);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

// Ghi ngay từng dòng (appendFileSync) chứ không gom cuối lượt: chạy 162 sản phẩm
// mất hơn hai tiếng, và Ctrl+C hay mất mạng giữa đường thì phần đã ghi vào DB
// phải còn dấu vết để hoàn tác.
function ghiLog(ban) {
  fs.mkdirSync(path.dirname(TEP_LOG), { recursive: true });
  fs.appendFileSync(TEP_LOG, JSON.stringify(ban) + "\n", "utf8");
}

/* -------------------------------------------------------------- 6. Lô ------ */

/**
 * Chọn lô sản phẩm.
 *
 * Thứ tự cố định (createdAt rồi slug) để hai lần chạy trên cùng dữ liệu ra cùng
 * một lô — có thứ tự ổn định thì --gioi-han mới dùng được để chia đợt.
 */
async function chonLo(prisma) {
  const daXongTruocDo = new Set(
    co.has("tu-dau")
      ? docLog()
          .filter((d) => d.cheDo === "ghi" && d.trangThai === "xong")
          .map((d) => d.slug)
      : [],
  );

  const dieuKien = SLUG_CHON
    ? { slug: { in: SLUG_CHON } }
    : { isDeleted: false, description: "{}" };

  const dong = await prisma.koiProduct.findMany({
    where: dieuKien,
    orderBy: [{ createdAt: "asc" }, { slug: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      status: true,
      isDeleted: true,
      basePrice: true,
    },
  });

  if (SLUG_CHON) {
    const thieu = SLUG_CHON.filter((s) => !dong.some((d) => d.slug === s));
    if (thieu.length) {
      console.warn(`Không có sản phẩm nào với slug: ${thieu.join(", ")}`);
    }
  }

  const lo = [];
  const boQua = [];
  for (const sp of dong) {
    // --tu-dau: bỏ qua món đã có mô tả (kể cả khi chỉ định bằng --slug) và món
    // đã ghi xong ở lần chạy trước. Đây là phần làm script chạy lại được mà
    // không ghi đè công đã làm.
    if (co.has("tu-dau")) {
      if (goBoc(sp.description)?.trim()) {
        boQua.push(`${sp.slug}: đã có mô tả`);
        continue;
      }
      if (daXongTruocDo.has(sp.slug)) {
        boQua.push(`${sp.slug}: lần chạy trước đã ghi xong`);
        continue;
      }
    }
    lo.push(sp);
    if (GIOI_HAN && lo.length >= GIOI_HAN) break;
  }

  return { lo, boQua };
}

/* --------------------------------------------------- 7. Nhịp gọi + retry --- */

// Xếp hàng cho các lượt gọi AI: lượt sau chỉ bắt đầu sau lượt trước ít nhất
// NGHI_MS. Dùng chuỗi promise nên đúng cả khi --dong-thoi > 1 — nếu chỉ để mỗi
// luồng tự sleep thì 3 luồng vẫn bắn 3 lượt cùng lúc rồi cùng ăn 429.
let mocGoiCuoi = 0;
let hangCho = Promise.resolve();
function xepLuot() {
  const luot = hangCho.then(async () => {
    const con = mocGoiCuoi + NGHI_MS - Date.now();
    if (con > 0) await new Promise((r) => setTimeout(r, con));
    mocGoiCuoi = Date.now();
  });
  hangCho = luot.catch(() => {});
  return luot;
}

/** Chờ giữa hai lần thử lại. Có nhiễu ngẫu nhiên để 3 luồng không cùng tỉnh. */
const CHO_THU_LAI = [5000, 15000];

function maLoi(e) {
  return typeof e?.getStatus === "function" ? e.getStatus() : 0;
}

/**
 * Lỗi tạm hay lỗi thật.
 *
 * openai.client.ts gói MỌI lỗi HTTP không phải 401 thành BadGateway (502) và 429
 * thành ServiceUnavailable (503), nên bắt theo mã là đủ cho phần mạng. Thêm phần
 * bắt theo chữ cho hai câu "Thử lại lượt nữa" (JSON model trả về không hợp lệ) —
 * chúng là 400 nhưng lượt sau thường qua.
 */
function nenThuLai(e) {
  if ([408, 425, 429, 500, 502, 503, 504].includes(maLoi(e))) return true;
  return /Thử lại lượt nữa|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|EAI_AGAIN/i.test(
    String(e?.message ?? ""),
  );
}

/* --------------------------------------------- 7b. Soi chữ AI vừa sinh ----- */

/** Cặp thẻ phải khớp số lượng. Thẻ tự đóng (<br>, <img>) không nằm ở đây. */
const THE_CAP = ["p", "ul", "ol", "li", "strong", "em", "h2", "h3", "a"];

/**
 * Bắt những kiểu sai mà tầng dưới KHÔNG bắt được.
 *
 * AiEditService.sinh() đã có phần luuY, nhưng ba kiểm tra của nó (rút ngắn quá
 * nhiều, mất thẻ <a>, vượt độ dài SEO) đều so với BẢN GỐC — mà ở đây bản gốc là
 * chuỗi rỗng, nên cả ba đều im lặng. Đúng lúc cần soi nhất thì không có ai soi.
 *
 * Mọi mẫu ở đây đều đến từ chữ AI thật sinh ra trong lần chạy thử, không phải
 * phòng xa lý thuyết. Cảnh báo chứ không sửa: không bao giờ tự vá chữ của model
 * rồi ghi vào site — vá được cái thẻ hở thì không vá được câu bịa.
 */
function canhBaoChu(chu, laHtml) {
  const y = [];
  const s = String(chu ?? "");

  if (laHtml) {
    for (const the of THE_CAP) {
      const mo = (s.match(new RegExp(`<${the}(\\s[^>]*)?>`, "gi")) || []).length;
      const dong = (s.match(new RegExp(`</${the}>`, "gi")) || []).length;
      if (mo !== dong) y.push(`thẻ <${the}> hở (${mo} mở / ${dong} đóng)`);
    }
    if (/```|^#{1,6}\s|\*\*/m.test(s)) y.push("có dấu Markdown lẫn vào HTML");
  }

  // Các phép soi chữ chạy trên phần ĐÃ BỎ THẺ. Không bỏ thì href="https://…"
  // trong thẻ <a> tính là "chữ trong ngoặc kép" và món nào có liên kết nội bộ
  // cũng bị cảnh báo oan.
  const t = s.replace(/<[^>]+>/g, " ");

  // Số kèm đơn vị đo, tiền, thời hạn — đúng thứ lời dặn cấm bịa. Số trơn không
  // tính: "3 ngăn" đếm được trong ảnh thì viết ra không sai.
  const so = t.match(
    /\b\d+([.,]\d+)?\s*(cm|mm|dm|m|ml|lít|l|kg|gram|g|inch|tháng|năm|ngày|tuần|giờ|đ|vnđ|vnd|k|triệu|%)\b/gi,
  );
  if (so) y.push(`có số kèm đơn vị: ${[...new Set(so)].join(", ")}`);
  const soDai = t.match(/\d{3,}/g);
  if (soDai) y.push(`có dãy số dài: ${[...new Set(soDai)].join(", ")}`);

  // Chữ trong ngoặc kép gần như luôn là tên/logo model đọc từ ảnh. Lần chạy thử
  // đầu tiên trả về nguyên tên một thương hiệu khách đặt hàng.
  const trichDan = t.match(/["“][^"”]{2,40}["”]/g);
  if (trichDan) {
    y.push(
      `có chữ trong ngoặc kép (nghi là logo/tên đọc từ ảnh): ${trichDan.join(" ")}`,
    );
  }
  if (/\blogo\b|thương hiệu|nhãn hiệu|dập tên|khắc tên/i.test(t)) {
    y.push("nhắc tới logo/tên riêng — kiểm xem có phải tên khách đặt hàng");
  }

  if (/bảo hành|đổi trả|hoàn tiền|giao hàng|freeship|ship\b/i.test(t)) {
    y.push("nhắc chính sách (bảo hành/đổi trả/giao hàng) — khuôn trang đã có");
  }
  if (/trong ảnh|như hình|có thể thấy|trong hình|ảnh trên/i.test(t)) {
    y.push('viết như người bình ảnh ("trong ảnh", "như hình"…)');
  }
  if (/cắt laser|dập máy|khâu máy|in kỹ thuật số/i.test(t)) {
    y.push("đoán cách gia công — dữ liệu không có thông tin này");
  }
  if (laHtml && t.trim().length < 200) {
    y.push("mô tả quá ngắn (dưới 200 ký tự chữ thật)");
  }
  return y;
}

/* -------------------------------------------------- 8. Chạy một sản phẩm ---- */

function catChu(s, n) {
  const chu = String(s ?? "");
  return chu.length <= n ? chu : `${chu.slice(0, n)}… (còn ${chu.length - n} ký tự, xem tệp log)`;
}

/**
 * Một sản phẩm: gọi AI (có thử lại) rồi ghi nếu có --ghi.
 *
 * Trả về bản ghi để cộng dồn cho phần tóm tắt. KHÔNG ném lỗi ra ngoài: một món
 * lỗi thì cả lô vẫn phải đi tiếp — 162 món mà dừng ở món thứ 3 là lần chạy nào
 * cũng phải trông.
 */
async function chayMotSanPham(svc, sp, thuTu, tong) {
  const nhan = `[${thuTu}/${tong}] ${sp.slug}`;
  const duong = `/cua-hang/${sp.slug}/`;
  const ban = {
    luc: new Date().toISOString(),
    dot: DOT,
    cheDo: CHE_DO_GHI ? "ghi" : "thu",
    slug: sp.slug,
    id: sp.id,
    trangThai: "loi",
    batch: null,
    soTruong: 0,
    soKyTuMoTa: 0,
    model: null,
    soToken: null,
    soAnhDaXem: null,
    canhBao: [],
    loi: null,
  };

  let kq = null;
  for (let lan = 0; lan <= CHO_THU_LAI.length; lan++) {
    try {
      await xepLuot();
      kq = await svc.sinh(duong, YEU_CAU, TRUONG);
      break;
    } catch (e) {
      const mo = `${maLoi(e) || "?"} ${e?.message ?? e}`;
      if (lan < CHO_THU_LAI.length && nenThuLai(e)) {
        const cho = CHO_THU_LAI[lan] + Math.floor(Math.random() * 2000);
        console.warn(`${nhan}: lỗi tạm (${mo}) — thử lại sau ${Math.round(cho / 1000)}s`);
        await new Promise((r) => setTimeout(r, cho));
        continue;
      }
      ban.loi = mo;
      console.error(`${nhan}: LỖI ${mo}`);
      ghiLog(ban);
      return ban;
    }
  }

  ban.model = kq.model;
  ban.soToken = kq.soToken;
  ban.soAnhDaXem = kq.daDua?.soAnhDaXem ?? null;

  // Bỏ trường AI trả lại y nguyên hoặc trả về null: đưa chúng sang apDung() thì
  // hàm đó ném "chữ mới giống chữ cũ" và mất luôn các trường hợp lệ cùng lượt.
  const canGhi = kq.thayDoi.filter((t) => !t.khongDoi && t.sau != null);
  const moTa = canGhi.find((t) => t.truong === "description");
  ban.soKyTuMoTa = moTa ? String(moTa.sau).length : 0;
  ban.soTruong = canGhi.length;

  const dauVao = kq.daDua
    ? `dm=[${kq.daDua.danhMuc.join("|")}] da=[${kq.daDua.loaiDa.join("|")}] mau=[${kq.daDua.mau.join("|")}] ảnh=${kq.daDua.soAnhDaXem}`
    : "không có ngữ cảnh";

  if (!canGhi.length) {
    ban.trangThai = "boQua";
    ban.loi = "AI không đề nghị thay đổi nào.";
    console.warn(`${nhan}: bỏ qua — AI không đề nghị gì (${dauVao})`);
    ghiLog(ban);
    return ban;
  }

  for (const c of kq.canhBao) console.warn(`${nhan}: ${c}`);

  // Soi chữ trước khi ghi. Cảnh báo của tầng service (t.luuY) cộng với phần soi
  // riêng ở đây — xem doc canhBaoChu() về vì sao cần cả hai.
  const canhBao = canGhi.flatMap((t) => [
    ...t.luuY.map((l) => `${t.truong}: ${l}`),
    ...canhBaoChu(t.sau, t.html).map((l) => `${t.truong}: ${l}`),
  ]);
  ban.canhBao = canhBao;

  if (!CHE_DO_GHI) {
    ban.trangThai = "thuXong";
    // Chữ đầy đủ chỉ lưu ở chế độ thử. Chế độ ghi thì bản gốc và bản mới đã nằm
    // trong KoiContentRevision, chép lại vào đây là hai chỗ giữ cùng một thứ.
    ban.chuMoi = Object.fromEntries(canGhi.map((t) => [t.truong, t.sau]));
    console.log(`\n${"─".repeat(78)}\n${nhan}  (${sp.status}, ${dauVao})`);
    console.log(`model=${kq.model} token=${kq.soToken ?? "?"}`);
    for (const t of canGhi) {
      console.log(`\n  ▸ ${t.truong} (${String(t.sau).length} ký tự)`);
      console.log(`    ${catChu(t.sau, 1400).replace(/\n/g, "\n    ")}`);
    }
    for (const c of canhBao) console.log(`  ⚠ ${c}`);
    console.log(`\n  → CHƯA GHI GÌ (chế độ thử). Thêm --ghi để ghi thật.`);
    ghiLog(ban);
    return ban;
  }

  // Có cảnh báo thì KHÔNG ghi, trừ khi người chạy nói rõ là chấp nhận.
  //
  // Mặc định nghiêng về "để đó cho người đọc" chứ không "cứ ghi rồi sửa sau":
  // ghi vào là 162 trang có khách đọc, mà sai kiểu bịa tên thương hiệu thì hoàn
  // tác được nhưng người ngoài đã kịp thấy. Chữ vẫn nằm trong tệp log để đọc
  // lại, không phải gọi AI lần nữa.
  for (const c of canhBao) console.warn(`${nhan}: ⚠ ${c}`);
  if (canhBao.length && !co.has("ghi-ca-khi-canh-bao")) {
    ban.trangThai = "boQua";
    ban.loi = `có ${canhBao.length} cảnh báo nội dung, chưa ghi`;
    ban.chuMoi = Object.fromEntries(canGhi.map((t) => [t.truong, t.sau]));
    console.warn(
      `${nhan}: bỏ qua — ${ban.loi}. Đọc chữ trong tệp log, sửa lời dặn rồi chạy lại, hoặc thêm --ghi-ca-khi-canh-bao.`,
    );
    ghiLog(ban);
    return ban;
  }

  try {
    const ra = await svc.apDung({
      kind: kq.kind,
      id: kq.id,
      path: kq.path,
      prompt: YEU_CAU,
      model: kq.model,
      actor: ACTOR,
      thayDoi: canGhi.map((t) => ({ truong: t.truong, truoc: t.truoc, sau: t.sau })),
    });
    ban.trangThai = "xong";
    ban.batch = ra.batch;
    ban.soTruong = ra.soTruong;
    for (const b of ra.boQua) console.warn(`${nhan}: ${b}`);
    console.log(
      `${nhan}: đã ghi ${ra.soTruong} trường, mô tả ${ban.soKyTuMoTa} ký tự, batch ${ra.batch}`,
    );
  } catch (e) {
    ban.loi = `apDung: ${maLoi(e) || "?"} ${e?.message ?? e}`;
    console.error(`${nhan}: LỖI ${ban.loi}`);
  }
  ghiLog(ban);
  return ban;
}

/* ------------------------------------------------------------ 9. Hoàn tác --- */

const LA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Hoàn tác cả đợt. Đòi cả --ghi vì đây cũng là ghi vào nội dung đang chạy.
 *
 * Nhận mã batch trực tiếp, hoặc tệp log + --dot: sau một đợt 162 món thì có 162
 * mã batch, dán tay không xong nên phải lần theo mã đợt trong tệp log.
 */
async function hoanTacDot(svc) {
  const x = String(co.get("hoan-tac"));
  let danhSach;
  if (LA_UUID.test(x) && !fs.existsSync(path.resolve(GOC, x))) {
    danhSach = [x];
  } else {
    const dot = co.get("dot");
    if (!dot || dot === true) {
      throw new Error("Hoàn tác theo tệp log thì phải kèm --dot=<mã đợt>.");
    }
    danhSach = docLog()
      .filter((d) => d.dot === String(dot) && d.batch)
      .map((d) => d.batch);
  }
  if (!danhSach.length) throw new Error("Không tìm được mã batch nào để hoàn tác.");
  if (!CHE_DO_GHI) {
    console.log(
      `Sẽ hoàn tác ${danhSach.length} batch. Đây là thao tác GHI — chạy lại kèm --ghi.`,
    );
    return;
  }

  let xong = 0;
  for (const batch of danhSach) {
    try {
      const ra = await svc.hoanTac(batch, ACTOR, co.has("buoc"));
      xong++;
      console.log(`Hoàn tác ${batch}: ${ra.soTruong} trường. ${ra.boQua.join(" ")}`);
    } catch (e) {
      console.error(`Hoàn tác ${batch} LỖI: ${e?.message ?? e}`);
    }
  }
  console.log(`\nĐã hoàn tác ${xong}/${danhSach.length} batch.`);
}

/* ---------------------------------------------------------------- 10. main -- */

async function main() {
  const app = await NestFactory.createApplicationContext(AiEditModule, {
    logger: ["error", "warn"],
  });
  try {
    const svc = app.get(AiEditService);
    const prisma = app.get(PrismaService);

    if (co.has("hoan-tac")) {
      await hoanTacDot(svc);
      return;
    }

    const { lo, boQua } = await chonLo(prisma);
    const trangThaiKey = svc.trangThai();

    console.log(
      [
        `Đợt: ${DOT}`,
        `Chế độ: ${CHI_LIET_KE ? "LIỆT KÊ (không gọi AI)" : CHE_DO_GHI ? "GHI THẬT vào DB" : "THỬ (không ghi DB)"}`,
        `Model: ${trangThaiKey.model} · key trên máy: ${trangThaiKey.daCoKey ? "có" : "KHÔNG"}`,
        `Trường: ${TRUONG.join(", ")} · đồng thời: ${DONG_THOI} · nghỉ: ${NGHI_MS}ms`,
        `Lô: ${lo.length} sản phẩm${boQua.length ? ` (bỏ qua ${boQua.length})` : ""}`,
        `Nhật ký: ${path.relative(GOC, TEP_LOG)}`,
      ].join("\n"),
    );
    for (const b of boQua) console.log(`  · bỏ qua ${b}`);

    if (!lo.length) {
      console.log("\nKhông có sản phẩm nào trong lô.");
      return;
    }

    if (CHI_LIET_KE) {
      console.log("");
      for (const [i, sp] of lo.entries()) {
        console.log(
          `${String(i + 1).padStart(3)}. ${sp.slug}` +
            `  [${sp.status}${sp.basePrice ? "" : ", chưa có giá"}]  ${goBoc(sp.name) ?? ""}`,
        );
      }
      console.log(`\n--liet-ke: không gọi AI, không ghi gì.`);
      return;
    }

    // Chạy tuần tự trong từng luồng; số luồng = --dong-thoi. Nhịp gọi AI vẫn do
    // xepLuot() điều, nên tăng luồng không làm dồn cục lên OpenAI.
    const ketQua = [];
    let ke = 0;
    const luong = Array.from({ length: Math.min(DONG_THOI, lo.length) }, () =>
      (async () => {
        while (ke < lo.length) {
          const i = ke++;
          ketQua.push(await chayMotSanPham(svc, lo[i], i + 1, lo.length));
        }
      })(),
    );
    await Promise.all(luong);

    const dem = (t) => ketQua.filter((k) => k.trangThai === t).length;
    const token = ketQua.reduce((a, k) => a + (k.soToken ?? 0), 0);
    const batch = ketQua.filter((k) => k.batch).map((k) => k.batch);

    console.log(`\n${"═".repeat(78)}`);
    console.log(
      `Xong: ${CHE_DO_GHI ? dem("xong") : dem("thuXong")} · bỏ qua: ${dem("boQua")} · lỗi: ${dem("loi")} · tổng lô: ${lo.length}`,
    );
    console.log(`Tổng token: ${token || "không rõ"}`);
    const coCanhBao = ketQua.filter((k) => k.canhBao?.length);
    if (coCanhBao.length) {
      console.log(
        `Có cảnh báo nội dung: ${coCanhBao.length} món${CHE_DO_GHI && !co.has("ghi-ca-khi-canh-bao") ? " (đã bỏ qua, không ghi)" : ""}`,
      );
      for (const k of coCanhBao) {
        console.log(`  ⚠ ${k.slug}: ${k.canhBao.join(" · ")}`);
      }
    }
    const dai = ketQua.filter((k) => k.soKyTuMoTa).map((k) => k.soKyTuMoTa);
    if (dai.length) {
      console.log(
        `Mô tả mới: ${Math.min(...dai)}–${Math.max(...dai)} ký tự (trung bình ${Math.round(dai.reduce((a, b) => a + b, 0) / dai.length)})`,
      );
    }
    for (const k of ketQua.filter((k) => k.trangThai === "loi")) {
      console.log(`  ✗ ${k.slug}: ${k.loi}`);
    }

    if (batch.length) {
      console.log(`\nHoàn tác CẢ ĐỢT này (${batch.length} batch):`);
      console.log(
        `  node scripts/viet-mo-ta-hang-loat.mjs --ghi --hoan-tac=${path.relative(GOC, TEP_LOG).replace(/\\/g, "/")} --dot=${DOT}`,
      );
      console.log(`Hoàn tác một món lẻ:`);
      console.log(`  node scripts/viet-mo-ta-hang-loat.mjs --ghi --hoan-tac=<mã batch>`);
    } else if (!CHE_DO_GHI) {
      console.log(`\nChưa ghi gì vào DB. Thêm --ghi để ghi thật.`);
    }
  } finally {
    await app.close();
  }
}

main().catch((e) => {
  console.error(`Dừng: ${e?.message ?? e}`);
  process.exit(1);
});
