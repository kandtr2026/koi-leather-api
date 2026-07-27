const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getCommitHash() {
  const envHash = process.env.VERCEL_GIT_COMMIT_SHA;
  if (envHash) return envHash;
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return 'unknown';
  }
}

// Format timestamp theo múi giờ Asia/Ho_Chi_Minh (UTC+7)
function formatBuildTime() {
  const now = new Date();
  const offset = 7 * 60; // UTC+7 in minutes
  const local = new Date(now.getTime() + offset * 60 * 1000);
  const parts = local.toISOString().split('T');
  const datePart = parts[0]; // YYYY-MM-DD
  const timePart = parts[1].split('.')[0]; // HH:mm:ss
  const localISO = `${datePart}T${timePart}+07:00`;
  const dd = String(local.getUTCDate()).padStart(2, '0');
  const mm = String(local.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = local.getUTCFullYear();
  const hh = String(local.getUTCHours()).padStart(2, '0');
  const mi = String(local.getUTCMinutes()).padStart(2, '0');
  return {
    iso: localISO,
    display: `${dd}/${mm}/${yyyy} ${hh}:${mi}`,
    raw: now.toISOString(),
  };
}

const commit = getCommitHash();
const buildTime = formatBuildTime();
const shortCommit = commit.slice(0, 7);

const meta = {
  commit,
  shortCommit,
  buildTime: buildTime.iso,
  buildTimeDisplay: buildTime.display,
  buildTimestamp: buildTime.raw,
};

const rootDir = path.resolve(__dirname, '..');
const targets = [
  path.join(rootDir, 'public', 'build-meta.json'),
  path.join(rootDir, 'dist', 'build-meta.json'),
];

for (const target of targets) {
  const dir = path.dirname(target);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(target, JSON.stringify(meta));
}

console.log('[build-meta]', JSON.stringify(meta));
