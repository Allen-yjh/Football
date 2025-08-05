#!/bin/bash

# 数据备份脚本
# 使用方法: ./backup.sh

set -e

echo "开始备份足球青训管理系统数据..."

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 设置备份目录
BACKUP_DIR="/backup/football-system"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="football-backup-$DATE"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据文件
echo -e "${YELLOW}备份数据文件...${NC}"
mkdir -p $BACKUP_DIR/$BACKUP_NAME/data
cp /var/www/football-backend/*.json $BACKUP_DIR/$BACKUP_NAME/data/ 2>/dev/null || echo "没有找到JSON数据文件"

# 备份上传文件
echo -e "${YELLOW}备份上传文件...${NC}"
if [ -d "/var/www/football-backend/uploads" ]; then
    mkdir -p $BACKUP_DIR/$BACKUP_NAME/uploads
    cp -r /var/www/football-backend/uploads/* $BACKUP_DIR/$BACKUP_NAME/uploads/
fi

# 备份配置文件
echo -e "${YELLOW}备份配置文件...${NC}"
mkdir -p $BACKUP_DIR/$BACKUP_NAME/config
cp /etc/nginx/conf.d/football.conf $BACKUP_DIR/$BACKUP_NAME/config/ 2>/dev/null || echo "Nginx配置文件不存在"
cp /var/www/football-backend/pm2.config.js $BACKUP_DIR/$BACKUP_NAME/config/ 2>/dev/null || echo "PM2配置文件不存在"

# 备份前端构建文件
echo -e "${YELLOW}备份前端构建文件...${NC}"
if [ -d "/var/www/football-frontend/build" ]; then
    mkdir -p $BACKUP_DIR/$BACKUP_NAME/frontend
    cp -r /var/www/football-frontend/build/* $BACKUP_DIR/$BACKUP_NAME/frontend/
fi

# 创建压缩包
echo -e "${YELLOW}创建备份压缩包...${NC}"
cd $BACKUP_DIR
tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME
rm -rf $BACKUP_NAME

# 清理旧备份（保留最近7天的备份）
echo -e "${YELLOW}清理旧备份文件...${NC}"
find $BACKUP_DIR -name "football-backup-*.tar.gz" -mtime +7 -delete

# 显示备份信息
echo -e "${GREEN}备份完成！${NC}"
echo "备份文件: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
echo "备份大小: $(du -h $BACKUP_DIR/$BACKUP_NAME.tar.gz | cut -f1)"

# 列出所有备份文件
echo -e "${YELLOW}当前备份文件列表：${NC}"
ls -lh $BACKUP_DIR/*.tar.gz 2>/dev/null || echo "没有找到备份文件" 