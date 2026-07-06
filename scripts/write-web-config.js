const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../apps/mobile/dist');

function trimUrl(value) {
  return (value ?? '').replace(/\/$/, '');
}

function resolvePublicApkDownloadUrl(siteUrl, apkDirect) {
  const site = trimUrl(siteUrl);
  const direct = trimUrl(apkDirect);
  return site ? `${site}/tingting.apk` : direct;
}

function writeWebConfig() {
  const siteUrl = trimUrl(process.env.EXPO_PUBLIC_SITE_URL);
  const apkDirect = trimUrl(process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL);
  const config = {
    apkDownloadUrl: resolvePublicApkDownloadUrl(siteUrl, apkDirect),
    siteUrl,
    apiUrl: trimUrl(process.env.EXPO_PUBLIC_API_URL),
  };

  if (!fs.existsSync(distDir)) {
    console.warn('[write-web-config] apps/mobile/dist not found — run build:web first');
    return config;
  }

  fs.writeFileSync(path.join(distDir, 'app-config.json'), `${JSON.stringify(config, null, 2)}\n`);
  console.log(
    `[write-web-config] wrote app-config.json (apk: ${config.apkDownloadUrl ? config.apkDownloadUrl : 'empty'})`,
  );
  return config;
}

module.exports = { writeWebConfig, resolvePublicApkDownloadUrl };

if (require.main === module) {
  writeWebConfig();
}
