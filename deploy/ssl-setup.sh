#!/bin/bash

# SSL证书配置脚本
# 使用方法: ./ssl-setup.sh

set -e

echo "配置SSL证书..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    exit 1
fi

# 安装certbot
echo -e "${YELLOW}安装certbot...${NC}"
if command -v yum &> /dev/null; then
    # CentOS/RHEL
    yum install -y certbot python3-certbot-nginx
else
    # Ubuntu/Debian
    apt install -y certbot python3-certbot-nginx
fi

echo -e "${YELLOW}请按照以下步骤配置SSL证书：${NC}"
echo ""
echo "1. 确保域名已解析到服务器IP"
echo "2. 确保80端口已开放"
echo "3. 运行以下命令获取证书："
echo "   certbot --nginx -d your-domain.com"
echo ""
echo "4. 证书自动续期："
echo "   crontab -e"
echo "   添加：0 12 * * * /usr/bin/certbot renew --quiet"
echo ""
echo -e "${GREEN}SSL证书配置说明完成！${NC}" 