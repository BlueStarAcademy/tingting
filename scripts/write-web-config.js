const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../apps/mobile/dist');

function trimUrl(value) {
  return (value ?? '').replace(/\/$/, '');
}

function writeWebConfig() {
  const config = {
    apkDownloadUrl: trimUrl(process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL),
    siteUrl: trimUrl(process.env.EXPO_PUBLIC_SITE_URL),
    apiUrl: trimUrl(process.env.EXPO_PUBLIC_API_URL),
  };

  if (!fs.existsSync(distDir)) {
    console.warn('[write-web-config] apps/mobile/dist not found — run build:web first');
    return config;
  }

  fs.writeFileSync(path.join(distDir, 'app-config.json'), `${JSON.stringify(config, null, 2)}\n`);
  console.log(
    `[write-web-config] wrote app-config.json (apk: ${config.apkDownloadUrl ? 'set' : 'empty'})`,
  );
  return config;
}

module.exports = { writeWebConfig };

if (require.main === module) {
  writeWebConfig();
}
