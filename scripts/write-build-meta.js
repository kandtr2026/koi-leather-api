const fs = require('fs');
const path = require('path');
const distDir = path.join(__dirname, '..', 'dist');
const meta = { buildTime: new Date().toISOString() };
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'build-meta.json'), JSON.stringify(meta));
console.log('[build-meta]', meta.buildTime);
