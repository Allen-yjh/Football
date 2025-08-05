#!/bin/bash

# 服务器环境配置脚本
# 在轻量应用服务器上执行

set -e

echo "开始配置服务器环境..."

# 更新系统
echo "更新系统包..."
apt-get update
apt-get upgrade -y

# 安装基础工具
echo "安装基础工具..."
apt-get install -y curl wget git vim htop unzip software-properties-common

# 安装Docker
echo "安装Docker..."
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 安装Docker Compose
echo "安装Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# 安装Node.js
echo "安装Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装PM2
echo "安装PM2..."
npm install -g pm2

# 安装Nginx
echo "安装Nginx..."
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# 安装MySQL
echo "安装MySQL..."
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# 配置MySQL
echo "配置MySQL..."
mysql -e "CREATE DATABASE IF NOT EXISTS football CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'football'@'localhost' IDENTIFIED BY 'football123';"
mysql -e "GRANT ALL PRIVILEGES ON football.* TO 'football'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# 安装Certbot (SSL证书)
echo "安装Certbot..."
apt-get install -y certbot python3-certbot-nginx

# 安装监控工具
echo "安装监控工具..."
apt-get install -y htop iotop nethogs

# 创建应用目录
echo "创建应用目录..."
mkdir -p /var/www/football
mkdir -p /var/log/football
mkdir -p /backup

# 配置防火墙
echo "配置防火墙..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 配置SSH安全
echo "配置SSH安全..."
sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

# 创建非root用户
echo "创建非root用户..."
useradd -m -s /bin/bash football
usermod -aG docker football
usermod -aG sudo football

# 配置Nginx
echo "配置Nginx..."
cat > /etc/nginx/sites-available/football << 'EOF'
server {
    listen 80;
    server_name _;
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # 前端静态文件
    location / {
        root /var/www/football/frontend/build;
        try_files $uri $uri/ /index.html;
        
        # 缓存静态资源
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # AI服务
    location /ai/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # 健康检查
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/football /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 测试Nginx配置
nginx -t

# 重启Nginx
systemctl restart nginx

# 创建备份脚本
echo "创建备份脚本..."
cat > /root/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u football -pfootball123 football > $BACKUP_DIR/db_$DATE.sql

# 备份应用文件
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C /var/www football

# 备份配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz /etc/nginx/sites-available/football

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "备份完成: $DATE"
EOF

chmod +x /root/backup.sh

# 添加到定时任务
(crontab -l 2>/dev/null; echo "0 2 * * * /root/backup.sh") | crontab -

# 创建监控脚本
echo "创建监控脚本..."
cat > /root/monitor.sh << 'EOF'
#!/bin/bash

# 检查服务状态
check_service() {
    local service=$1
    if systemctl is-active --quiet $service; then
        echo "✓ $service 运行正常"
    else
        echo "✗ $service 异常"
        systemctl restart $service
    fi
}

# 检查磁盘空间
check_disk() {
    local usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $usage -gt 80 ]; then
        echo "警告: 磁盘使用率 $usage%"
    fi
}

# 检查内存使用
check_memory() {
    local usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [ $usage -gt 80 ]; then
        echo "警告: 内存使用率 $usage%"
    fi
}

# 执行检查
check_service nginx
check_service mysql
check_service docker
check_disk
check_memory
EOF

chmod +x /root/monitor.sh

# 添加到定时任务
(crontab -l 2>/dev/null; echo "*/5 * * * * /root/monitor.sh") | crontab -

# 设置文件权限
echo "设置文件权限..."
chown -R www-data:www-data /var/www/football
chmod -R 755 /var/www/football

# 创建日志轮转配置
echo "创建日志轮转配置..."
cat > /etc/logrotate.d/football << 'EOF'
/var/log/football/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
}
EOF

echo "服务器环境配置完成！"
echo ""
echo "已安装的服务:"
echo "- Docker: $(docker --version)"
echo "- Node.js: $(node --version)"
echo "- NPM: $(npm --version)"
echo "- PM2: $(pm2 --version)"
echo "- Nginx: $(nginx -v 2>&1)"
echo "- MySQL: $(mysql --version)"
echo ""
echo "下一步: 部署应用程序" 