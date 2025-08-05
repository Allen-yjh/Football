#!/bin/bash

# 一键部署脚本 - 足球青训管理系统
# 使用方法: ./one-click-deploy.sh

set -e

echo "🚀 开始一键部署足球青训管理系统..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}请使用root权限运行此脚本${NC}"
    exit 1
fi

# 配置变量
DOMAIN=""
SERVER_IP=""
DB_PASSWORD=""
ADMIN_EMAIL=""

# 获取用户输入
echo -e "${BLUE}请输入配置信息：${NC}"
read -p "域名 (如: football.yourdomain.com): " DOMAIN
read -p "服务器IP: " SERVER_IP
read -p "数据库密码: " DB_PASSWORD
read -p "管理员邮箱: " ADMIN_EMAIL

# 验证输入
if [ -z "$DOMAIN" ] || [ -z "$SERVER_IP" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${RED}请填写所有必要信息${NC}"
    exit 1
fi

echo -e "${GREEN}配置信息确认：${NC}"
echo "域名: $DOMAIN"
echo "服务器IP: $SERVER_IP"
echo "管理员邮箱: $ADMIN_EMAIL"

read -p "确认继续部署？(y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "部署已取消"
    exit 0
fi

# 开始部署
echo -e "${YELLOW}=== 第1步：系统环境检查 ===${NC}"

# 检查系统
if command -v yum &> /dev/null; then
    OS="centos"
    echo "检测到CentOS系统"
elif command -v apt &> /dev/null; then
    OS="ubuntu"
    echo "检测到Ubuntu系统"
else
    echo -e "${RED}不支持的操作系统${NC}"
    exit 1
fi

# 检查网络连接
echo "检查网络连接..."
if ! ping -c 1 8.8.8.8 &> /dev/null; then
    echo -e "${RED}网络连接失败${NC}"
    exit 1
fi

echo -e "${GREEN}系统环境检查通过${NC}"

echo -e "${YELLOW}=== 第2步：安装基础软件 ===${NC}"

# 更新系统
echo "更新系统包..."
if [ "$OS" = "centos" ]; then
    yum update -y
    yum install -y epel-release
    yum install -y nginx nodejs npm git curl wget unzip
    yum install -y ffmpeg
else
    apt update && apt upgrade -y
    apt install -y nginx nodejs npm git curl wget unzip
    apt install -y ffmpeg
fi

# 安装PM2
echo "安装PM2进程管理器..."
npm install -g pm2

echo -e "${GREEN}基础软件安装完成${NC}"

echo -e "${YELLOW}=== 第3步：创建项目目录 ===${NC}"

# 创建目录
mkdir -p /var/www/football-frontend
mkdir -p /var/www/football-backend
mkdir -p /var/log/pm2
mkdir -p /etc/nginx/ssl
mkdir -p /backup/football-system

# 设置权限
chown -R nginx:nginx /var/www/football-frontend
chown -R nginx:nginx /var/www/football-backend

echo -e "${GREEN}项目目录创建完成${NC}"

echo -e "${YELLOW}=== 第4步：配置Nginx ===${NC}"

# 创建Nginx配置
cat > /etc/nginx/conf.d/football.conf << EOF
server {
    listen 80;
    server_name $DOMAIN;
    
    # 重定向到HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;
    
    # SSL证书配置（稍后配置）
    # ssl_certificate /etc/nginx/ssl/$DOMAIN.crt;
    # ssl_certificate_key /etc/nginx/ssl/$DOMAIN.key;
    
    # 前端静态文件
    location / {
        root /var/www/football-frontend/build;
        index index.html index.htm;
        try_files \$uri \$uri/ /index.html;
        
        # 缓存配置
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # 后端API代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
    
    # 文件上传目录
    location /uploads/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# 启动Nginx
systemctl enable nginx
systemctl start nginx

echo -e "${GREEN}Nginx配置完成${NC}"

echo -e "${YELLOW}=== 第5步：配置防火墙 ===${NC}"

# 配置防火墙
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=ssh
    firewall-cmd --reload
    echo "防火墙配置完成（CentOS）"
else
    ufw allow 80
    ufw allow 443
    ufw allow 22
    ufw --force enable
    echo "防火墙配置完成（Ubuntu）"
fi

echo -e "${GREEN}防火墙配置完成${NC}"

echo -e "${YELLOW}=== 第6步：创建PM2配置 ===${NC}"

# 创建PM2配置
cat > /var/www/football-backend/pm2.config.js << EOF
module.exports = {
  apps: [{
    name: 'football-backend',
    script: 'index.js',
    cwd: '/var/www/football-backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DOMAIN: '$DOMAIN',
      DB_PASSWORD: '$DB_PASSWORD'
    },
    error_file: '/var/log/pm2/football-backend-error.log',
    out_file: '/var/log/pm2/football-backend-out.log',
    log_file: '/var/log/pm2/football-backend-combined.log',
    time: true
  }]
};
EOF

echo -e "${GREEN}PM2配置创建完成${NC}"

echo -e "${YELLOW}=== 第7步：创建部署脚本 ===${NC}"

# 创建部署脚本
cat > /var/www/deploy.sh << 'EOF'
#!/bin/bash

echo "开始部署应用..."

# 进入后端目录
cd /var/www/football-backend

# 安装依赖
npm install --production

# 创建uploads目录
mkdir -p uploads
chmod 755 uploads

# 启动服务
pm2 start pm2.config.js

# 保存PM2配置
pm2 save

# 设置PM2开机自启
pm2 startup

# 重启Nginx
systemctl restart nginx

echo "部署完成！"
EOF

chmod +x /var/www/deploy.sh

echo -e "${GREEN}部署脚本创建完成${NC}"

echo -e "${YELLOW}=== 第8步：创建监控脚本 ===${NC}"

# 创建监控脚本
cat > /usr/local/bin/monitor.sh << 'EOF'
#!/bin/bash

echo "=== 系统状态监控 ==="
echo "时间: $(date)"
echo ""

echo "系统资源:"
echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
echo "内存使用:"
free -h
echo ""

echo "服务状态:"
echo "Nginx: $(systemctl is-active nginx)"
echo "PM2进程数: $(pm2 list | grep -c 'online')"
echo ""

echo "网络连接:"
echo "HTTP端口: $(netstat -tlnp | grep :80 | wc -l)"
echo "HTTPS端口: $(netstat -tlnp | grep :443 | wc -l)"
echo "应用端口: $(netstat -tlnp | grep :3001 | wc -l)"
echo ""

echo "磁盘使用:"
df -h /
echo ""
EOF

chmod +x /usr/local/bin/monitor.sh

echo -e "${GREEN}监控脚本创建完成${NC}"

echo -e "${YELLOW}=== 第9步：创建备份脚本 ===${NC}"

# 创建备份脚本
cat > /usr/local/bin/backup.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/backup/football-system"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="football-backup-$DATE"

mkdir -p $BACKUP_DIR/$BACKUP_NAME

# 备份数据文件
cp /var/www/football-backend/*.json $BACKUP_DIR/$BACKUP_NAME/ 2>/dev/null || echo "没有找到JSON文件"

# 备份上传文件
if [ -d "/var/www/football-backend/uploads" ]; then
    cp -r /var/www/football-backend/uploads $BACKUP_DIR/$BACKUP_NAME/
fi

# 备份配置文件
cp /etc/nginx/conf.d/football.conf $BACKUP_DIR/$BACKUP_NAME/
cp /var/www/football-backend/pm2.config.js $BACKUP_DIR/$BACKUP_NAME/

# 创建压缩包
cd $BACKUP_DIR
tar -czf $BACKUP_NAME.tar.gz $BACKUP_NAME
rm -rf $BACKUP_NAME

echo "备份完成: $BACKUP_DIR/$BACKUP_NAME.tar.gz"
EOF

chmod +x /usr/local/bin/backup.sh

echo -e "${GREEN}备份脚本创建完成${NC}"

echo -e "${YELLOW}=== 第10步：生成部署报告 ===${NC}"

# 生成部署报告
cat > /var/www/deployment-report.txt << EOF
足球青训管理系统部署报告
部署时间: $(date)
服务器IP: $SERVER_IP
域名: $DOMAIN

=== 部署状态 ===
✅ 系统环境配置完成
✅ 基础软件安装完成
✅ 项目目录创建完成
✅ Nginx配置完成
✅ 防火墙配置完成
✅ PM2配置完成
✅ 部署脚本创建完成
✅ 监控脚本创建完成
✅ 备份脚本创建完成

=== 下一步操作 ===
1. 上传前端代码到: /var/www/football-frontend/build/
2. 上传后端代码到: /var/www/football-backend/
3. 运行部署命令: /var/www/deploy.sh
4. 配置SSL证书: certbot --nginx -d $DOMAIN
5. 测试访问: https://$DOMAIN

=== 常用命令 ===
监控系统: /usr/local/bin/monitor.sh
备份数据: /usr/local/bin/backup.sh
重启服务: pm2 restart football-backend
查看日志: pm2 logs football-backend
重启Nginx: systemctl restart nginx

=== 联系信息 ===
管理员邮箱: $ADMIN_EMAIL
部署时间: $(date)
EOF

echo -e "${GREEN}部署报告生成完成${NC}"

echo -e "${GREEN}🎉 一键部署完成！${NC}"
echo ""
echo -e "${BLUE}=== 部署摘要 ===${NC}"
echo "✅ 系统环境配置完成"
echo "✅ 基础软件安装完成"
echo "✅ 项目目录创建完成"
echo "✅ Nginx配置完成"
echo "✅ 防火墙配置完成"
echo "✅ PM2配置完成"
echo "✅ 监控和备份脚本创建完成"
echo ""
echo -e "${YELLOW}=== 下一步操作 ===${NC}"
echo "1. 上传前端代码到: /var/www/football-frontend/build/"
echo "2. 上传后端代码到: /var/www/football-backend/"
echo "3. 运行部署命令: /var/www/deploy.sh"
echo "4. 配置SSL证书: certbot --nginx -d $DOMAIN"
echo "5. 测试访问: https://$DOMAIN"
echo ""
echo -e "${BLUE}=== 常用命令 ===${NC}"
echo "监控系统: /usr/local/bin/monitor.sh"
echo "备份数据: /usr/local/bin/backup.sh"
echo "重启服务: pm2 restart football-backend"
echo "查看日志: pm2 logs football-backend"
echo "重启Nginx: systemctl restart nginx"
echo ""
echo -e "${GREEN}部署报告已保存到: /var/www/deployment-report.txt${NC}"
echo ""
echo -e "${GREEN}🚀 您的足球青训管理系统即将上线！${NC}" 