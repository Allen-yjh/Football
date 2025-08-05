#!/bin/bash

# 云服务器环境配置脚本（CentOS 版）

set -e

echo "开始配置云服务器环境..."

# 更新系统
yum update -y

# 安装基础工具
yum install -y curl wget git vim htop unzip

# 安装Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker

# 安装Node.js（以Node.js 18为例）
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# 安装PM2
npm install -g pm2

# 安装Nginx
yum install -y epel-release
yum install -y nginx
systemctl start nginx
systemctl enable nginx

# 安装MySQL（以MySQL 8为例）
yum install -y https://dev.mysql.com/get/mysql80-community-release-el7-7.noarch.rpm
yum install -y mysql-server
systemctl start mysqld
systemctl enable mysqld

# 配置MySQL（初次安装需设置root密码，以下为示例）
MYSQL_ROOT_PASSWORD="YourRootPassword123!"
echo "ALTER USER 'root'@'localhost' IDENTIFIED BY '$MYSQL_ROOT_PASSWORD';" | mysql -u root || true

mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "CREATE DATABASE IF NOT EXISTS football CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "CREATE USER IF NOT EXISTS 'football'@'localhost' IDENTIFIED BY 'football123';"
mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "GRANT ALL PRIVILEGES ON football.* TO 'football'@'localhost';"
mysql -uroot -p$MYSQL_ROOT_PASSWORD -e "FLUSH PRIVILEGES;"

# 安装Certbot
yum install -y certbot python3-certbot-nginx

# 创建应用目录
mkdir -p /var/www/football
mkdir -p /var/log/football
mkdir -p /backup

# 配置防火墙
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-service=ssh
firewall-cmd --reload

# 配置Nginx
cat > /etc/nginx/conf.d/football.conf << 'EOF'
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

# 重启Nginx
systemctl restart nginx

# 设置文件权限
chown -R nginx:nginx /var/www/football
chmod -R 755 /var/www/football

echo "云服务器环境配置完成！（CentOS）"
echo "MySQL root 密码为: $MYSQL_ROOT_PASSWORD"
echo "如首次安装MySQL，建议检查 /var/log/mysqld.log 获取临时密码并手动设置。" 