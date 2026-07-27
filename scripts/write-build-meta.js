const fs = require('fs');
const path = require('path');
const rootDir = path.join(__dirname, '..');
const meta = { buildTime: new Date().toISOString() };
const locations = [
  path.join(rootDir, 'dist', 'build-meta.json'),
  path.join(rootDir, 'public', 'build-meta.json'),
];
for (const loc of locations) {
  fs.mkdirSync(path.dirname(loc), { recursive: true });
  fs.writeFileSync(loc, JSON.stringify(meta));
}
console.log('[build-meta]', meta.buildTime);
