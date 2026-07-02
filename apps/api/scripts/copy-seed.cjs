const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '../../../seed/places.json');
const dst = path.join(__dirname, '../seed/places.json');

if (!fs.existsSync(src)) {
  console.error('Missing seed/places.json at repo root');
  process.exit(1);
}

fs.mkdirSync(path.dirname(dst), { recursive: true });
fs.copyFileSync(src, dst);
console.log(`Copied ${src} -> ${dst}`);
