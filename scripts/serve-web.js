const http = require('http');
const path = require('path');
const handler = require('serve-handler');
const { writeWebConfig } = require('./write-web-config');

writeWebConfig();

const dist = path.join(__dirname, '../apps/mobile/dist');
const port = Number(process.env.PORT || 8080);

const server = http.createServer(async (req, res) => {
  await handler(req, res, {
    public: dist,
    rewrites: [{ source: '**', destination: '/index.html' }],
    headers: [
      {
        source: 'sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: 'manifest.json',
        headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
      },
    ],
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`[serve-web] listening on :${port} (PWA static)`);
});
