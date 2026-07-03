const { spawn } = require('child_process');
const path = require('path');
const { writeWebConfig } = require('./write-web-config');

writeWebConfig();

const dist = path.join(__dirname, '../apps/mobile/dist');
const port = process.env.PORT || 8080;
const listen = `tcp://0.0.0.0:${port}`;

const child = spawn('npx', ['serve', dist, '-s', '-l', listen], {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
