#!/bin/bash

# 启动足球青训管理系统服务
# 使用方法: ./start-services.sh

set -e

echo "启动足球青训管理系统服务..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查目录是否存在
if [ ! -d "/var/www/football-backend" ]; then
    echo -e "${YELLOW}后端目录不存在，请先上传代码${NC}"
    exit 1
fi

if [ ! -d "/var/www/football-frontend/build" ]; then
    echo -e "${YELLOW}前端构建目录不存在，请先构建前端${NC}"
    exit 1
fi

# 进入后端目录
cd /var/www/football-backend

# 安装后端依赖
echo -e "${YELLOW}安装后端依赖...${NC}"
npm install --production

# 创建uploads目录
mkdir -p uploads
chmod 755 uploads

# 启动后端服务
echo -e "${YELLOW}启动后端服务...${NC}"
pm2 start pm2.config.js

# 保存PM2配置
pm2 save

# 设置PM2开机自启
pm2 startup

# 重启Nginx
echo -e "${YELLOW}重启Nginx...${NC}"
systemctl restart nginx

# 检查服务状态
echo -e "${YELLOW}检查服务状态...${NC}"
pm2 status
systemctl status nginx

echo -e "${GREEN}服务启动完成！${NC}"
echo -e "${YELLOW}访问地址：https://your-domain.com${NC}"
echo -e "${YELLOW}PM2管理：pm2 monit${NC}"
echo -e "${YELLOW}查看日志：pm2 logs football-backend${NC}" 