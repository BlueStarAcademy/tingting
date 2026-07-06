const http = require('http');
const path = require('path');
const handler = require('serve-handler');
const { writeWebConfig } = require('./write-web-config');

writeWebConfig();

const dist = path.join(__dirname, '../apps/mobile/dist');
const port = Number(process.env.PORT || 8080);
const apkSourceUrl = (process.env.EXPO_PUBLIC_APK_DOWNLOAD_URL ?? '').replace(/\/$/, '');

async function serveApk(_req, res) {
  if (!apkSourceUrl) {
    res.statusCode = 404;
    res.end('APK not configured');
    return;
  }

  try {
    const upstream = await fetch(apkSourceUrl, { redirect: 'follow' });
    if (!upstream.ok) {
      res.statusCode = 502;
      res.end('APK unavailable');
      return;
    }

    const body = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="tingting.apk"');
    res.setHeader('Content-Length', body.length);
    res.end(body);
  } catch {
    res.statusCode = 502;
    res.end('APK download failed');
  }
}

const server = http.createServer(async (req, res) => {
  const pathname = (req.url ?? '/').split('?')[0];
  if (pathname === '/tingting.apk') {
    await serveApk(req, res);
    return;
  }

  await handler(req, res, {
    public: dist,
    rewrites: [{ source: '**', destination: '/index.html' }],
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[serve-web] listening on :${port} (apk proxy: ${apkSourceUrl ? 'on' : 'off'})`);
});
