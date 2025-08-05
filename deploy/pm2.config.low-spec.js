module.exports = {
  apps: [{
    name: 'football-backend',
    script: 'index.js',
    cwd: '/var/www/football-backend',
    instances: 1,  // 单实例，避免内存不足
    autorestart: true,
    watch: false,
    max_memory_restart: '800M',  // 降低内存限制
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      // 优化Node.js内存使用
      NODE_OPTIONS: '--max-old-space-size=512'
    },
    error_file: '/var/log/pm2/football-backend-error.log',
    out_file: '/var/log/pm2/football-backend-out.log',
    log_file: '/var/log/pm2/football-backend-combined.log',
    time: true,
    // 添加内存监控
    min_uptime: '10s',
    max_restarts: 10
  }]
}; 