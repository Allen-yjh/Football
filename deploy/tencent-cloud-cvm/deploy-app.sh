#!/bin/bash
# 应用部署脚本（CentOS 版）
set -e

echo "开始部署足球青训管理系统..."

# 检查项目目录
PROJECT_DIR="/root/Football"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "错误：项目目录 $PROJECT_DIR 不存在"
    exit 1
fi

cd "$PROJECT_DIR"

# 创建应用目录
APP_DIR="/var/www/football"
mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/frontend"
mkdir -p "$APP_DIR/backend"
mkdir -p "$APP_DIR/ai"

echo "1. 部署后端服务..."

# 部署后端
cd "$PROJECT_DIR/backend"
npm install --production

# 创建后端配置文件
cat > "$APP_DIR/backend/config.js" << EOF
module.exports = {
    port: process.env.PORT || 3001,
    database: {
        host: 'localhost',
        user: 'football_user',
        password: 'football_pass',
        database: 'football_db'
    },
    ollama: {
        host: 'http://localhost:11434'
    }
};
EOF

# 复制后端文件
cp -r * "$APP_DIR/backend/"
cp config.js "$APP_DIR/backend/"

# 创建PM2配置文件
cat > "$APP_DIR/backend/ecosystem.config.js" << EOF
module.exports = {
    apps: [{
        name: 'football-backend',
        script: 'index.js',
        cwd: '$APP_DIR/backend',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
            NODE_ENV: 'production',
            PORT: 3001
        }
    }]
};
EOF

echo "2. 部署前端服务..."

# 部署前端
cd "$PROJECT_DIR/frontend"
npm install
npm run build

# 复制构建文件
cp -r build/* "$APP_DIR/frontend/"

# 创建前端配置文件
cat > "$APP_DIR/frontend/config.js" << EOF
window.APP_CONFIG = {
    API_BASE_URL: 'http://localhost:3001',
    AI_SERVICE_URL: 'http://localhost:11434'
};
EOF

echo "3. 部署AI服务..."

# 创建AI服务Docker配置
cat > "$APP_DIR/ai/docker-compose.yml" << EOF
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    container_name: football-ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    restart: unless-stopped
    environment:
      - OLLAMA_HOST=0.0.0.0
      - OLLAMA_ORIGINS=*

volumes:
  ollama_data:
EOF

# 启动AI服务
cd "$APP_DIR/ai"
docker-compose up -d

# 等待AI服务启动
echo "等待AI服务启动..."
sleep 10

# 下载模型（如果需要）
echo "检查AI模型..."
if ! docker exec football-ollama ollama list | grep -q "llama2"; then
    echo "下载AI模型..."
    docker exec football-ollama ollama pull llama2
fi

echo "4. 启动后端服务..."

# 启动后端服务
cd "$APP_DIR/backend"
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "5. 配置Nginx..."

# 创建Nginx配置
cat > /etc/nginx/conf.d/football.conf << EOF
server {
    listen 80;
    server_name _;
    root /var/www/football/frontend;
    index index.html;

    # 前端静态文件
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # AI服务代理
    location /ai/ {
        proxy_pass http://localhost:11434/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # 文件上传
    location /uploads/ {
        alias /var/www/football/backend/uploads/;
    }
}
EOF

# 重启Nginx
systemctl restart nginx

echo "6. 设置权限..."

# 设置目录权限
chown -R nginx:nginx "$APP_DIR"
chmod -R 755 "$APP_DIR"

# 创建上传目录
mkdir -p "$APP_DIR/backend/uploads"
chown -R nginx:nginx "$APP_DIR/backend/uploads"
chmod -R 755 "$APP_DIR/backend/uploads"

echo "7. 创建数据库..."

# 创建数据库和用户
mysql -u root -p -e "
CREATE DATABASE IF NOT EXISTS football_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'football_user'@'localhost' IDENTIFIED BY 'football_pass';
GRANT ALL PRIVILEGES ON football_db.* TO 'football_user'@'localhost';
FLUSH PRIVILEGES;
"

echo "8. 创建备份脚本..."

# 创建备份脚本
cat > /root/backup-football.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/football"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# 备份应用文件
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" -C /var/www football

# 备份数据库
mysqldump -u root -p football_db > "$BACKUP_DIR/db_$DATE.sql"

# 删除7天前的备份
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "*.sql" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

chmod +x /root/backup-football.sh

# 添加到定时任务
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup-football.sh") | crontab -

echo "9. 创建监控脚本..."

# 创建监控脚本
cat > /root/monitor-football.sh << 'EOF'
#!/bin/bash
LOG_FILE="/var/log/football/monitor.log"

# 检查后端服务
if ! pm2 list | grep -q "football-backend"; then
    echo "$(date): 后端服务未运行，正在重启..." >> "$LOG_FILE"
    pm2 restart football-backend
fi

# 检查AI服务
if ! docker ps | grep -q "football-ollama"; then
    echo "$(date): AI服务未运行，正在重启..." >> "$LOG_FILE"
    cd /var/www/football/ai && docker-compose up -d
fi

# 检查Nginx
if ! systemctl is-active --quiet nginx; then
    echo "$(date): Nginx未运行，正在重启..." >> "$LOG_FILE"
    systemctl restart nginx
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 80 ]; then
    echo "$(date): 磁盘使用率过高: ${DISK_USAGE}%" >> "$LOG_FILE"
fi
EOF

chmod +x /root/monitor-football.sh

# 添加到定时任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor-football.sh") | crontab -

echo "部署完成！"
echo ""
echo "服务状态："
echo "- 前端: http://$(curl -s ifconfig.me)"
echo "- 后端API: http://$(curl -s ifconfig.me)/api"
echo "- AI服务: http://$(curl -s ifconfig.me)/ai"
echo ""
echo "管理命令："
echo "- 查看后端日志: pm2 logs football-backend"
echo "- 重启后端: pm2 restart football-backend"
echo "- 查看AI服务: docker logs football-ollama"
echo "- 重启AI服务: cd /var/www/football/ai && docker-compose restart"
echo "- 查看Nginx日志: tail -f /var/log/nginx/error.log"
echo ""
echo "备份和监控已自动配置完成！"
