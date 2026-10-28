// pm2 süreçleri (sunucu: hazal). İlk kurulum deploy/setup-server.sh, güncelleme deploy/deploy.sh.
// Sunucuda başka projeler de çalışıyor: ASLA `pm2 restart all` — yalnız playce-api / playce-worker.
const path = require('path');

const cwd = path.join(__dirname, '../apps/api'); // .env burada; Nest ConfigModule cwd'den okur

module.exports = {
  apps: [
    {
      name: 'playce-api',
      cwd,
      script: 'dist/main.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '400M',
      time: true,
    },
    {
      // Tek kopya, fork modunda (ADR-020): işler üst üste binmemeli. instances verme — pm2 cluster'a geçer.
      name: 'playce-worker',
      cwd,
      script: 'dist/worker.js',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '300M',
      time: true,
    },
  ],
};
