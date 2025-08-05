#!/bin/bash

# 云服务器环境配置脚本

set -e

echo "开始配置云服务器环境..."

# 更新系统
apt-get update
apt-get upgrade -y

# 安装基础工具
apt-get install -y curl wget git vim htop unzip

# 安装Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 安装PM2
npm install -g pm2

# 安装Nginx
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# 安装MySQL
apt-get install -y mysql-server
systemctl start mysql
systemctl enable mysql

# 配置MySQL
mysql -e "CREATE DATABASE IF NOT EXISTS football CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'football'@'localhost' IDENTIFIED BY 'football123';"
mysql -e "GRANT ALL PRIVILEGES ON football.* TO 'football'@'localhost';"
mysql -e "FLUSH PRIVILEGES;"

# 安装Certbot
apt-get install -y certbot python3-certbot-nginx

# 创建应用目录
mkdir -p /var/www/football
mkdir -p /var/log/football
mkdir -p /backup

# 配置防火墙
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 配置Nginx
cat > /etc/nginx/sites-available/football << 'EOF'
server {
    listen 80;
    server_name _;
    
    location / {
        root /var/www/football/frontend/build;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    location /ai/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 启用站点
ln -sf /etc/nginx/sites-available/football /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 重启Nginx
systemctl restart nginx

# 设置文件权限
chown -R www-data:www-data /var/www/football
chmod -R 755 /var/www/football

echo "云服务器环境配置完成！" 