const fs = require('fs');
const path = require('path');
const meta = { buildTime: new Date().toISOString() };
const publicDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(publicDir, { recursive: true });
fs.writeFileSync(path.join(publicDir, 'build-meta.json'), JSON.stringify(meta));
console.log('[build-meta]', meta.buildTime);
