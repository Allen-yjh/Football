module.exports = {
  apps: [{
    name: 'football-backend',
    script: 'index.js',
    cwd: '/var/www/football-backend',
    instances: 'max',  // 使用所有CPU核心
    exec_mode: 'cluster',  // 集群模式
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',  // 每个进程2GB内存限制
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      // 优化Node.js性能
      NODE_OPTIONS: '--max-old-space-size=1536 --optimize-for-size'
    },
    // 日志配置
    error_file: '/var/log/pm2/football-backend-error.log',
    out_file: '/var/log/pm2/football-backend-out.log',
    log_file: '/var/log/pm2/football-backend-combined.log',
    time: true,
    
    // 集群配置
    min_uptime: '10s',
    max_restarts: 10,
    
    // 负载均衡配置
    instance_var: 'INSTANCE_ID',
    
    // 监控配置
    pmx: true,
    
    // 环境变量
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
      REDIS_HOST: 'localhost',
      REDIS_PORT: 6379,
      DB_HOST: 'localhost',
      DB_PORT: 3306,
      DB_NAME: 'football',
      DB_USER: 'root',
      DB_PASSWORD: 'password'
    }
  }]
}; 