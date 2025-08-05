module.exports = {
  apps: [{
    name: 'football-backend',
    script: 'index.js',
    cwd: '/var/www/football-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: '/var/log/pm2/football-backend-error.log',
    out_file: '/var/log/pm2/football-backend-out.log',
    log_file: '/var/log/pm2/football-backend-combined.log',
    time: true
  }]
}; 