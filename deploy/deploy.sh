#!/bin/bash

# 足球青训管理系统部署脚本
# 使用方法: ./deploy.sh

set -e

echo "开始部署足球青训管理系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    exit 1
fi

# 更新系统
echo -e "${YELLOW}更新系统包...${NC}"
yum update -y || apt update && apt upgrade -y

# 安装必要的软件包
echo -e "${YELLOW}安装必要的软件包...${NC}"
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y epel-release
    yum install -y nginx nodejs npm git curl wget unzip
    yum install -y ffmpeg
else
    # Ubuntu/Debian
    apt install -y nginx nodejs npm git curl wget unzip
    apt install -y ffmpeg
fi

# 安装PM2
echo -e "${YELLOW}安装PM2进程管理器...${NC}"
npm install -g pm2

# 创建项目目录
echo -e "${YELLOW}创建项目目录...${NC}"
mkdir -p /var/www/football-frontend
mkdir -p /var/www/football-backend
mkdir -p /var/log/pm2
mkdir -p /etc/nginx/ssl

# 设置目录权限
chown -R nginx:nginx /var/www/football-frontend
chown -R nginx:nginx /var/www/football-backend

# 配置Nginx
echo -e "${YELLOW}配置Nginx...${NC}"
cp nginx.conf /etc/nginx/conf.d/football.conf
systemctl enable nginx
systemctl start nginx

# 配置防火墙
echo -e "${YELLOW}配置防火墙...${NC}"
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
else
    ufw allow 80
    ufw allow 443
    ufw allow 22
    ufw --force enable
fi

echo -e "${GREEN}基础环境配置完成！${NC}"
echo -e "${YELLOW}接下来需要：${NC}"
echo "1. 上传前端和后端代码到服务器"
echo "2. 配置SSL证书"
echo "3. 启动应用服务"
echo ""
echo -e "${GREEN}部署脚本执行完成！${NC}" 