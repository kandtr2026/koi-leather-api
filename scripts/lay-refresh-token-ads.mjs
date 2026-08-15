/**
 * Lay refresh token scope adwords. CHAY MOT LAN tren may minh, khong phai tren Vercel.
 *
 *   node scripts/lay-refresh-token-ads.mjs
 *
 * Truoc khi chay phai co OAuth client kieu "Desktop app" trong Google Cloud
 * Console, va project da bat Google Ads API.
 *
 * VI SAO KHONG DUNG LAI GOOGLE_CLIENT_ID CUA LOGIN ADMIN:
 *
 *  GOOGLE_CLIENT_ID hien tai la client kieu Web dung cho Google Identity
 *  Services — auth.service.ts chi goi verifyIdToken de xac minh nguoi dang
 *  nhap, khong co client secret va khong chay authorization code flow, nen no
 *  khong bao gio sinh ra refresh token. Ads API can refresh token co scope
 *  adwords. Tach client rieng thi luong dang nhap admin khong bi anh huong.
 *
 * VI SAO PHAI PUBLISH APP LEN "IN PRODUCTION":
 *
 *  OAuth consent screen de External + publishing status Testing thi Google thu
 *  hoi refresh token sau DUNG 7 NGAY. Code chay tot mot tuan roi chet voi
 *  invalid_grant, rat de tuong la loi code. Publish len In production la het,
 *  KHONG can qua verification (app dung rieng, duoi 100 nguoi thi bam qua man
 *  hinh canh bao "unverified app" duoc).
 *
 * VI SAO KHONG DUNG SERVICE ACCOUNT:
 *
 *  Google khuyen dung service account, nhung voi Ads API no can domain-wide
 *  delegation, ma cai do phai co Google Workspace. Tai khoan day la Gmail
 *  thuong nen chi con duong single-user refresh token.
 */
import { createServer } from 'node:http';
import { createInterface } from 'node:readline/promises';
import { randomBytes } from 'node:crypto';

const SCOPE = 'https://www.googleapis.com/auth/adwords';
// Desktop app client cho phep redirect ve localhost cong bat ky.
const PORT = 8737;
const REDIRECT = `http://localhost:${PORT}`;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const clientId = (await rl.question('Client ID: ')).trim();
const clientSecret = (await rl.question('Client Secret: ')).trim();
rl.close();

if (!clientId || !clientSecret) {
  console.error('Thieu client id hoac secret.');
  process.exit(1);
}

// state chong CSRF: chi nhan lai dung chuoi minh gui di.
const state = randomBytes(16).toString('hex');

const authUrl =
  'https://accounts.google.com/o/oauth2/v2/auth?' +
  new URLSearchParams({
    client_id: clientId,
    redirect_uri: REDIRECT,
    response_type: 'code',
    scope: SCOPE,
    // offline moi tra refresh token; thieu cai nay chi co access token 1 gio.
    access_type: 'offline',
    // Da tung dong y roi thi Google khong tra refresh token nua, tru khi
    // prompt=consent. Chay lai script lan hai ma thieu cai nay la nhan duoc
    // refresh_token = undefined.
    prompt: 'consent',
    state,
  }).toString();

console.log('\nMo duong nay tren trinh duyet dang dang nhap koi.leather19@gmail.com:\n');
console.log(authUrl);
console.log('\nHien "Google hasn\'t verified this app" thi bam Advanced -> Go to ... (unsafe).');
console.log('Dang cho Google goi ve localhost:' + PORT + ' ...\n');

/** Doi authorization code lay refresh token. */
async function doiCodeLayToken(code) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT,
      grant_type: 'authorization_code',
    }).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data)}`);
  return data;
}

const code = await new Promise((resolve, reject) => {
  const server = createServer((req, res) => {
    const url = new URL(req.url, REDIRECT);
    if (url.pathname !== '/') {
      res.writeHead(404).end();
      return;
    }
    const loi = url.searchParams.get('error');
    const nhanCode = url.searchParams.get('code');
    const nhanState = url.searchParams.get('state');

    const tra = (msg) => {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<meta charset="utf-8"><p style="font:16px system-ui">${msg}</p>`);
    };

    if (loi) {
      tra('Bi tu choi quyen. Quay lai terminal.');
      server.close();
      reject(new Error(`Google tra loi: ${loi}`));
      return;
    }
    if (nhanState !== state) {
      tra('State khong khop, bo qua.');
      server.close();
      reject(new Error('State khong khop — co the bi CSRF, chay lai script.'));
      return;
    }
    if (!nhanCode) {
      tra('Khong thay code.');
      return;
    }
    tra('Xong. Quay lai terminal de lay refresh token.');
    server.close();
    resolve(nhanCode);
  });
  server.listen(PORT);
  server.on('error', reject);
});

const token = await doiCodeLayToken(code);

if (!token.refresh_token) {
  console.error(
    '\nGoogle KHONG tra refresh_token. Thuong la vi da dong y truoc do roi.\n' +
      'Vao https://myaccount.google.com/permissions thu hoi quyen cua app nay roi chay lai.',
  );
  process.exit(1);
}

console.log('\n=== Nap 3 bien nay vao Vercel (Settings -> Environment Variables) ===\n');
console.log(`GOOGLE_ADS_CLIENT_ID=${clientId}`);
console.log(`GOOGLE_ADS_CLIENT_SECRET=${clientSecret}`);
console.log(`GOOGLE_ADS_REFRESH_TOKEN=${token.refresh_token}`);
console.log('\nCong voi 3 bien nay (developer token lay o MCC -> Admin -> API Center):\n');
console.log('GOOGLE_ADS_DEVELOPER_TOKEN=<token 22 ky tu>');
console.log('GOOGLE_ADS_LOGIN_CUSTOMER_ID=6088967842');
console.log('GOOGLE_ADS_CUSTOMER_ID=2328005201');
console.log(
  '\nHai so cuoi bo dau gach ngang: MCC 608-896-7842, Koi Leather 232-800-5201.',
);
console.log('\nDUNG commit refresh token vao git, dung dan vao chat.');
