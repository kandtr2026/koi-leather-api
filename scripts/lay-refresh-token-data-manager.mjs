#!/usr/bin/env node
/**
 * In OAuth URL cấp lại refresh token cho Google Ads + Data Manager API.
 *
 * Dùng khi Data Manager API trả invalid_scope vì refresh token cũ chỉ có scope
 * adwords. Khoa mở URL, cho phép, copy `code` từ redirect localhost về rồi chạy:
 *
 *   node scripts/lay-refresh-token-data-manager.mjs '<code hoặc localhost URL>'
 */
import fs from 'node:fs';
import { URL } from 'node:url';

function docEnv(p) {
  const out = {};
  for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#') || !line.includes('=')) continue;
    const [k, ...rest] = line.split('=');
    out[k.trim()] = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
  return out;
}

const env = docEnv('/root/.gsc-credentials/gads-creds.env');
const clientId = env.GADS_CLIENT_ID || process.env.GOOGLE_ADS_CLIENT_ID;
const clientSecret = env.GADS_CLIENT_SECRET || process.env.GOOGLE_ADS_CLIENT_SECRET;
const redirectUri = 'http://localhost';
const scope = [
  'https://www.googleapis.com/auth/adwords',
  'https://www.googleapis.com/auth/datamanager',
].join(' ');

if (!clientId || !clientSecret) {
  console.error('Thiếu GADS_CLIENT_ID/GADS_CLIENT_SECRET trong ~/.gsc-credentials/gads-creds.env');
  process.exit(1);
}

const raw = process.argv[2];
if (!raw) {
  const u = new URL('https://accounts.google.com/o/oauth2/auth');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', scope);
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'consent');
  console.log(u.toString());
  process.exit(0);
}

let code = raw.trim();
try {
  const u = new URL(code);
  code = u.searchParams.get('code') || code;
} catch {}

const body = new URLSearchParams({
  client_id: clientId,
  client_secret: clientSecret,
  redirect_uri: redirectUri,
  grant_type: 'authorization_code',
  code,
});

const res = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
  body,
});
const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}
console.log('GOOGLE_ADS_CLIENT_ID=' + clientId);
console.log('GOOGLE_ADS_CLIENT_SECRET=' + clientSecret);
console.log('GOOGLE_ADS_REFRESH_TOKEN=' + data.refresh_token);
console.log('GOOGLE_ADS_DEVELOPER_TOKEN=' + (env.GADS_DEVELOPER_TOKEN || '<token 22 ky tu>'));
console.log('GOOGLE_ADS_LOGIN_CUSTOMER_ID=6088967842');
console.log('GOOGLE_ADS_CUSTOMER_ID=2328005201');
console.log('GOOGLE_ADS_OFFLINE_CONVERSION_ACTION_ID=7732404856');
